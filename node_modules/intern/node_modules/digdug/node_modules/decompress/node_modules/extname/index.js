'use strict';

var endsWith = require('underscore.string').endsWith;
var extList = require('ext-list');
var map = require('map-key');
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
            return cb(err);
        }

        var obj = {};
        var key = Object.keys(res).sort(function (a, b) {
            return b.length - a.length;
        });

        for (var i = 0; i < Object.keys(res).length; i++) {
            obj[key[i]] = res[key[i]];
        }

        var mime = map(obj, str);
        var ext = Object.keys(obj).filter(function (key) {
            return endsWith(str, key);
        })[0] || path.extname(str);

        cb(null, mime ? { ext: ext, mime: mime } : { ext: ext });
    });
};
