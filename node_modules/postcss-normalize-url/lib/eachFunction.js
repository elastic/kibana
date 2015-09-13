'use strict';

var indexesOf = require('indexes-of');

module.exports = function eachFunction (value, type, callback) {
    if (~value.indexOf(type + '(')) {
        var locs = indexesOf(value, type);
        locs.push(value.length);
        while (locs.length > 1) {
            var sub = value.substring(locs[0], locs[1]);
            value = value.replace(sub, callback.call(this, sub));
            locs.shift();
        }
    }
    return value;
};
