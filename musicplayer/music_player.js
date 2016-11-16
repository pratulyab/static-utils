var MusicPlayer = (function () {
    "use strict";
    var songsList = [],
        audioObjs = {}, // songsList index mapped to audio files
        bindedFunctions = {}, // stores the binded functions of each audio 'ended' event; used when removing the event, otherwise multiple 'ended' firing events.
        isShuffle = false,
        playlistContainer, // the div containing the dropped music files
        controlsContainer, // the div containing the music control icons
        currentSongNumber = -1, // <Current song being played>'s index
        commonVolume = 1,
        lastTime = 0, // used to compare the last 'currentTime' (floored) of the song before updating the timer elements's html because timeupdate fires the event 4-5 times and replacing the html is costly.
        timer;
    
    
    function playSongNumber(index) {
        $('#seek-bar-bg').css('width', '0%');
        timer.html("00:00");
        if (index < 0 || index >= songsList.length) {
            return;
        }
        //console.log('Please play ' + songsList[index]);
        var to_be_played = audioObjs[index][0],
            list_items = playlistContainer.find('ul.list > li'),
            currently_being_played;
        if (currentSongNumber !== -1) {
            currently_being_played = audioObjs[currentSongNumber][0];
            currently_being_played.pause();
            currently_being_played.currentTime = 0;
            removeSongEventListeners(currentSongNumber);
            list_items.removeClass('playing');
        }
        addSongEventListeners(index);
        to_be_played.volume = commonVolume;
        to_be_played.play();
        currentSongNumber = index;
        $(list_items[index]).addClass('playing');
        $('#play-pause').removeClass('fa-play');
        $('#play-pause').addClass('fa-pause');
    }
    
    function addSongEntry(number, song_name) {
        song_name = number + ') ' + song_name;
        song_name = song_name.split('.')[0];
        var $li = $('<li/>');
        if (playlistContainer.find('.drop').length) {
            var $ul = $('<ul class="list"/>');
            $li.html(song_name);
            $ul.html($li);
            playlistContainer.html($ul);
            playlistContainer.on('dblclick', clearSelection);
        } else {
            $li.html(song_name);
            playlistContainer.find('.list').append($li);
        }
        $li.on('dblclick', playSongNumber.bind($li, number - 1));
    }
    
    // Clear dblclick selection
    function clearSelection() {
        if (document.selection && document.selection.empty) {
            document.selection.empty();
        } else if (window.getSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
        }
    }
    
    function whenSongEnds(index) {
        if (!isShuffle && index + 1 === songsList.length) {
            //console.log(songsList[index] + ' has finished playing, which was the last one.');
            // last song
            $('#play-pause').removeClass('fa-pause');
            $('#play-pause').addClass('fa-play');
            playlistContainer.find('li.playing').removeClass('playing');
            removeSongEventListeners(index);
            currentSongNumber = -1;
            $('#seek-bar-bg').css('width', '0%');
        } else {
            //console.log(songsList[index] + ' has finished playing.');
            if (isShuffle) {
                playSongNumber(getDiffRandomIndex());
            } else {
                playSongNumber(index + 1);
            }
        }
        timer.html("00:00:00");
    }
    
    function addSongEventListeners(index) {
        if (index < 0 || index >= songsList.length) {
            return;
        }
        var audio_object = audioObjs[index][0],
            bindedfunc = whenSongEnds.bind(audio_object, index);
        audio_object.addEventListener('ended', bindedfunc);
        audio_object.addEventListener('timeupdate', autoSeek);
        bindedFunctions[index] = bindedfunc;
    }
    
    function removeSongEventListeners(index) {
        if (index < 0 || index >= songsList.length) {
            return;
        }
        var audio_object = audioObjs[index][0];
        audio_object.removeEventListener('ended', bindedFunctions[index]);
        audio_object.removeEventListener('timeupdate', autoSeek);
        //console.log('event listeners on ' + songsList[index] + ' have been removed.');
    }
    
    /* Volume Bar's Events Handler Functions */
    
    function increaseVolumeBarVacancyTo(amt) {
        // amt is the percentage value that the empty bar's height should be set to
        var empty = $('#volume-empty');
        empty.attr('style', "height: " + amt + "% !important;");
        commonVolume = 1 - (amt / 100);
        if (currentSongNumber !== -1) {
            audioObjs[currentSongNumber][0].volume = commonVolume;
        }
    }
    
    function addVolumeEvents() {
        var volumeBar = $('#volume-bar'),
            empty = $('#volume-empty'),
            bar_height = volumeBar.height();
        volumeBar.on('click', function (e) {
            var click_Y = e.offsetY,
                fillby = ((bar_height - click_Y) / bar_height) * 100,
                vacancy_perc = (100 - fillby),
                mute = $('#mute');
            
            if (vacancy_perc > 95) {
                vacancy_perc = 100;
                mute.addClass('selected');
            } else {
                mute.removeClass('selected');
            }
            increaseVolumeBarVacancyTo(vacancy_perc);
        });
    }
    
    /* ***************************** */
    
    /* Controls' Events Handler Functions */
    
    function playpauseHandler(el, e) {
        if (currentSongNumber === -1) {
            return;
        }
        var current_audio_obj = audioObjs[currentSongNumber][0];
        if (current_audio_obj.paused) {
            el.removeClass('fa-play');
            el.addClass('fa-pause');
            current_audio_obj.play();
        } else {
            el.removeClass('fa-pause');
            el.addClass('fa-play');
            current_audio_obj.pause();
        }
    }
    
    function muteHandler(el, e) {
        if (el.hasClass('selected')) {
            el.removeClass('selected');
            increaseVolumeBarVacancyTo(0);
        } else {
            el.addClass('selected');
            increaseVolumeBarVacancyTo(100);
        }
    }
    
    function fullVolHandler(el, e) {
        $('#mute').removeClass('selected');
        increaseVolumeBarVacancyTo(0);
    }
    
    /* ***************************** */
    
    
    function addDragDropEvents() {
        playlistContainer = $('#playlist');
        var library = playlistContainer[0],
            counter = 0;
        
        library.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
        });
        
        library.addEventListener('dragenter', function (e) {
            e.preventDefault();
            playlistContainer.addClass('over');
            counter += 1;
        });
        
        library.addEventListener('dragleave', function (e) {
            counter -= 1;
            if (counter === 0) {
                playlistContainer.removeClass('over');
            }
        });
        
        library.addEventListener('drop', function (e) {
            counter = 0;
            e.preventDefault();
            e.stopPropagation();
            playlistContainer.removeClass('over');
            var otherFileTypes = false,
                files = e.dataTransfer.files, // 'files' will contain multiple files, if multiple files are dragged and dropped
                i;
            
            for (i = 0; i < files.length; i += 1) {
                let filename, filetype;
                filetype = files[i].type;
                filename = files[i].name;
                
                if (filetype.match('audio/.*')) {
                    var reader = new FileReader();
                    // Raising a toast on loading
                    Materialize.toast($('<b><span style="color: lightcoral;">Loading the file..</span></b>'), 700);
                    /*
                    reader.onloadstart = function (e) {
                        Materialize.toast($('<b><span style="color: lightcoral;">Loading the file..</span></b>'), 700);
                    }
                    */
                    reader.onloadend = function (e) {
                        if (reader.error) {
                            var msg = "Error occurred while loading " + filename;
                            Materialize.toast($('<b><span class="red-text">' + msg + '</span></b>'), 2000);
                        } else if (reader.readyState == 2) {
                            var audio = $('<audio/>'),
                                length;
                            audio[0].src = e.target.result;
                            length = songsList.push(filename);
                            audioObjs[parseInt(length) - 1] = audio;
                            addSongEntry(length, filename);
                        }
                    }
                    reader.readAsDataURL(files[i]);
                } else {
                    otherFileTypes = true;
                }
            }
            if (otherFileTypes) {
                Materialize.toast($('<b><span class="red-text">Only music files allowed!</span></b>'), 2000);
            }
        });
    }
    
    function addControlsEvents() {
        controlsContainer = $('#controls');
        var shuffle = controlsContainer.find('#shuffle'),
            previous = controlsContainer.find('#previous'),
            playpause = controlsContainer.find('#play-pause'),
            next = controlsContainer.find('#next'),
            mute = controlsContainer.find('#mute'),
            full = controlsContainer.find('#full-volume');
        
        /* Shuffle */
        shuffle.on('click', function (e) {
            if (isShuffle) {
                shuffle.removeClass('selected');
                isShuffle = false;
            } else {
                shuffle.addClass('selected');
                isShuffle = true;
            }
        });
        
        /* Previous */
        previous.on('click', function (e) {
            if (currentSongNumber === -1) {
                return;
            }
            if (isShuffle) {
                playSongNumber(getDiffRandomIndex());
            } else {
                var play_index = ((currentSongNumber - 1) < 0) ? 0 : (currentSongNumber - 1);
                //playSongNumber(currentSongNumber - 1);
                playSongNumber(play_index);
            }
        });
        
        /* Play-Pause */
        playpause.on('click', playpauseHandler.bind(playpause, playpause));
        
        /* Next */
        next.on('click', function (e) {
            if (currentSongNumber === -1) {
                return;
            }
            if (isShuffle) {
                playSongNumber(getDiffRandomIndex());
            } else {
                if (currentSongNumber + 1 === songsList.length) {
                    // end the song
                    var song = audioObjs[currentSongNumber][0];
                    song.currentTime = song.duration;
                } else {
                    playSongNumber(currentSongNumber + 1);
                }
            }
        });
        
        /* Mute + Full */
        mute.on('click', muteHandler.bind(mute, mute));
        full.on('click', fullVolHandler.bind(full, full));
    }
    
    /* Seeking Events Handler Functions */
    
    function seekTo(amt) {
        if (currentSongNumber === -1) {
            return;
        }
        var seek_bar_bg = $('#seek-bar-bg'),
            current_song_obj = audioObjs[currentSongNumber][0];
        seek_bar_bg.css('width', amt + '%');
        current_song_obj.currentTime = (amt / 100) * current_song_obj.duration;
    }
    
    function autoSeek() {
        var song = audioObjs[currentSongNumber][0],
            duration = song.duration,
            currentTime = song.currentTime,
            forward_by = (currentTime / duration),
            hours = 0, minutes = 0, seconds = 0;
        $("#seek-bar-bg").css('width', (forward_by * 100) + "%");
        
        // Update timer
        currentTime = Math.floor(currentTime);
        if (lastTime === currentTime) {
            return;
        } else {
            lastTime = currentTime;
        }
        while (currentTime >= 3600) {
            currentTime -= 3600;
            hours += 1;
        }
        while (currentTime >= 60) {
            currentTime -= 60;
            minutes += 1;
        }
        seconds = currentTime;
        if (seconds < 10) {
            seconds = '0' + seconds;
        }
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        if (hours) {
            hours = '0' + hours;
            timer.html(hours + ":" + minutes + ":" + seconds);
        } else {
            timer.html(minutes + ":" + seconds);
        }
    }
    
    function addSeekEvents() {
        var seekBar = $('#seek-bar');
        seekBar.on('click', function (e) {
            if (currentSongNumber === -1) {
                return;
            }
            var seek_to = e.offsetX / seekBar.innerWidth();
            seekTo(seek_to * 100);
        });
    }
    
    function getDiffRandomIndex() {
        if (currentSongNumber < 0 || songsList.length < 2) {
            return currentSongNumber;
        }
        var random = currentSongNumber;
        while (random === currentSongNumber) {
            random = (Math.floor(Math.random() * songsList.length));
        }
        return random;
    }
    
    /* ***************************** */
    
    
    return {
        init: function () {
            var i;
            timer = $('#timer');
            
            // function calls to add various event listeners
            addDragDropEvents();
            addControlsEvents();
            addVolumeEvents();
            addSeekEvents();
            
            // Keyboard Events on window
            $(window).on('keydown', function (e) {
            // not writing e.preventDefault() here because it would block all keyboard activities. Even Cmd+~ to swtich tabs!
                
                switch (e.which) {
                        
                case 32: // Space
                    e.preventDefault();
                    var playpause = $('#play-pause');
                    playpauseHandler(playpause, e);
                    break;

                case 38: // Up Arrow; Increase vol by 10%
                    e.preventDefault(); // to prevent scrolling
                    var empty = $('#volume-empty'),
                        bar = empty.parent(),
                        vacancy = ((parseFloat(empty.height() / bar.height()) * 100) - 10);
                    if (vacancy > 85) {
                        $('#mute').removeClass('selected');
                    }
                    if (vacancy < 5) {
                        vacancy = 0;
                    }
                    increaseVolumeBarVacancyTo(vacancy);
                    break;
                        
                case 40: // Down Arrow; Decrease vol by 10%
                    e.preventDefault(); // to prevent scrolling
                    var empty = $('#volume-empty'),
                        bar = empty.parent(),
                        vacancy = ((parseFloat(empty.height() / bar.height()) * 100) + 10);
                    if (vacancy > 95) {
                        vacancy = 100;
                        $('#mute').addClass('selected');
                    }
                    increaseVolumeBarVacancyTo(vacancy);
                    break;
                        
                case 37: // Left Arrow; Rewind
                    e.preventDefault();
                    var seek_bar_bg = $('#seek-bar-bg'),
                        seek_to = (seek_bar_bg.innerWidth() / seek_bar_bg.parent().innerWidth()) * 100 - 3;
                    if (seek_to < 1) {
                        seek_to = 0;
                    }
                    seekTo(seek_to);
                    break;
                
                case 39: // Right Arrow; Forward
                    e.preventDefault();
                    var seek_bar_bg = $('#seek-bar-bg'),
                        seek_to = (seek_bar_bg.innerWidth() / seek_bar_bg.parent().innerWidth()) * 100 + 3;
                    if (seek_to > 99.5) {
                        seek_to = 100;
                    }
                    seekTo(seek_to);
                    break;
                }
            });
            
            // Info
            $('.modal').modal();
        }
    };
    
}());