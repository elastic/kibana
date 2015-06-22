'use strict';

var endsWith = require('underscore.string').endsWith;
var extList = require('ext-list');
var path = require('path');

/**
 * Get the file extension and MIME type from a file
 *
 * @param {String} str
 * @api public
 */

module.exports = function (str, cb) {
    extList(function (err, res) {
        if (err) {
            cb(err);
            return;
        }

        var obj = {};
        var keys = Object.keys(res).sort(function (a, b) {
            return b.length - a.length;
        });

        keys.forEach(function (key, i) {
            obj[keys[i]] = res[keys[i]];
        });

        var ext = Object.keys(obj).filter(function (key) {
            return endsWith(str, key);
        })[0] || path.extname(str);

        cb(null, obj[ext] ? { ext: ext, mime: obj[ext] } : { ext: ext });
    });
};
