'use strict';

var find = require('lodash').find;
var endsWith = require('underscore.string').endsWith;

/**
 * Map an object key that ends with a value
 *
 * @param {Object} obj
 * @param {String} val
 * @api public
 */

module.exports = function (obj, val) {
    var o = {};
    var k = Object.keys(obj).sort(function (a, b) {
        return b.length - a.length;
    });

    for (var i = 0; i < Object.keys(obj).length; i++) {
        o[k[i]] = obj[k[i]];
    }

    var ret = find(Object.keys(o), function (ret) {
        ret = ret ? ret.toLowerCase() : ret;
        val = val ? val.toLowerCase() : val;

        return endsWith(val, ret);
    });

    return ret ? o[ret] : null;
};
