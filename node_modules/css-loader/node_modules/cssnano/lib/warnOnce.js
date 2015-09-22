'use strict';

var messages = {};

module.exports = function warnOnce (message) {
    if (messages[message]) { return; }
    messages[message] = true;
    if (typeof console !== 'undefined' && console.warn) {
        console.warn(message);
    }
};
