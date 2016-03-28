"use strict";
var vows = require('vows');
var assert = require('assert');
var log4js = require('../lib/log4js');
var sandbox = require('sandboxed-module');

function setupLogging(category, options) {
    var msgs = [];

    var hipchatCredentials = {
        api_key: options.api_key,
        room_id: options.room_id,
        from: options.from,
        message: options.message,
        format: options.format,
        color: options.color,
        notify: options.notify
    };
    var fakeHipchat = (function (key) {
        function constructor() {
            return {
                options: key,
                api: {
                    rooms: {
                        message: function (data, callback) {
                            msgs.push(data);
                            callback(false, {status: "sent"});
                        }
                    }
                }
            }
        }

        return constructor(key);
    });

    var fakeLayouts = {
        layout: function (type, config) {
            this.type = type;
            this.config = config;
            return log4js.layouts.messagePassThroughLayout;
        },
        basicLayout: log4js.layouts.basicLayout,
        coloredLayout: log4js.layouts.coloredLayout,
        messagePassThroughLayout: log4js.layouts.messagePassThroughLayout
    };

    var fakeConsole = {
        errors: [],
        logs: [],
        error: function (msg, value) {
            this.errors.push({msg: msg, value: value});
        },
        log: function (msg, value) {
            this.logs.push({msg: msg, value: value});
        }
    };


    var hipchatModule = sandbox.require('../lib/appenders/hipchat', {
        requires: {
            'hipchat-client': fakeHipchat,
            '../layouts': fakeLayouts
        },
        globals: {
            console: fakeConsole
        }
    });


    log4js.addAppender(hipchatModule.configure(options), category);

    return {
        logger: log4js.getLogger(category),
        mailer: fakeHipchat,
        layouts: fakeLayouts,
        console: fakeConsole,
        messages: msgs,
        credentials: hipchatCredentials
    };
}

function checkMessages(result) {
    for (var i = 0; i < result.messages.length; ++i) {
        assert.equal(result.messages[i].from, 'FROM');
        assert.equal(result.messages[i].room_id, 'ROOMID');
        assert.ok(new RegExp('.+Log event #' + (i + 1)).test(result.messages[i].message));
    }
}

log4js.clearAppenders();

vows.describe('log4js hipchatAppender').addBatch({
    'hipchat setup': {
        topic: setupLogging('hipchat setup', {
            api_key: 'APIKEY',
            room_id: "ROOMID",
            from: "FROM",
            message: "This is the message",
            format: "FORMAT",
            color: "This is the color",
            notify: "NOTIFY"
        }),
        'hipchat credentials should match': function (result) {
            assert.equal(result.credentials.api_key, 'APIKEY');
            assert.equal(result.credentials.room_id, 'ROOMID');
            assert.equal(result.credentials.from, 'FROM');
            assert.equal(result.credentials.format, 'FORMAT');
            assert.equal(result.credentials.notify, 'NOTIFY');

        }
    },

    'basic usage': {
        topic: function () {
            var setup = setupLogging('basic usage', {
                api_key: 'APIKEY',
                room_id: "ROOMID",
                from: "FROM",
                message: "This is the message",
                format: "FORMAT",
                color: "This is the color",
                notify: "NOTIFY"
            });

            setup.logger.info("Log event #1");
            return setup;
        },
        'there should be one message only': function (result) {
            assert.equal(result.messages.length, 1);
        },
        'message should contain proper data': function (result) {
            checkMessages(result);
        }
    },
    'config with layout': {
        topic: function () {
            var setup = setupLogging('config with layout', {
                layout: {
                    type: "tester"
                }
            });
            return setup;
        },
        'should configure layout': function (result) {
            assert.equal(result.layouts.type, 'tester');
        }
    },
    'separate notification for each event': {
        topic: function () {
            var self = this;
            var setup = setupLogging('separate notification for each event', {
                api_key: 'APIKEY',
                room_id: "ROOMID",
                from: "FROM",
                message: "This is the message",
                format: "FORMAT",
                color: "This is the color",
                notify: "NOTIFY"
            });
            setTimeout(function () {
                setup.logger.info('Log event #1');
            }, 0);
            setTimeout(function () {
                setup.logger.info('Log event #2');
            }, 500);
            setTimeout(function () {
                setup.logger.info('Log event #3');
            }, 1100);
            setTimeout(function () {
                self.callback(null, setup);
            }, 3000);
        },
        'there should be three messages': function (result) {
            assert.equal(result.messages.length, 3);
        },
        'messages should contain proper data': function (result) {
            checkMessages(result);
        }
    }
}).export(module);

