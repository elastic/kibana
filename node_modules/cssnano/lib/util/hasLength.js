'use strict';

var identity = require('./identity');

/**
 * Check that every argument passed in has a truthy length value
 * @return {boolean}
 */
module.exports = function hasLength (/** arguments... */) {
    return Array.prototype.slice.call(arguments).map(function (arg) {
        return arg.length;
    }).every(identity);
};
