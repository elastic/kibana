"use strict";
var HipChatClient = require('hipchat-client');
var layouts = require('../layouts');
var layout;

var hipchat, config;

//hipchat has more limited colors
var colours = {
    ALL: "grey",
    TRACE: "purple",
    DEBUG: "purple",
    INFO: "green",
    WARN: "yellow",
    ERROR: "red",
    FATAL: "red",
    OFF: "grey"
};

function hipchatAppender(_config, _layout) {

    layout = _layout || layouts.basicLayout;

    return function (loggingEvent) {

        var data = {
            room_id: _config.room_id,
            from: _config.from,
            message: layout(loggingEvent, _config.timezoneOffset),
            format: _config.format,
            color: colours[loggingEvent.level.toString()],
            notify: _config.notify
        };

        hipchat.api.rooms.message(data, function (err, res) {
            if (err) { throw err; }
        });
    };
}

function configure(_config) {

    if (_config.layout) {
        layout = layouts.layout(_config.layout.type, _config.layout);
    }

    hipchat = new HipChatClient(_config.api_key);

    return hipchatAppender(_config, layout);
}

exports.name      = 'hipchat';
exports.appender = hipchatAppender;
exports.configure = configure;
