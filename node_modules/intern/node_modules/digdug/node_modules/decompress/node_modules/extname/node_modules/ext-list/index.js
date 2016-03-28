'use strict';

var got = require('got');

/**
 * List of known file extensions and their MIME types
 *
 * @param {Function} cb
 * @api public
 */

module.exports = function (cb) {
    return got('http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types', function (err, res) {
        if (err) {
            return cb(err);
        }

        var obj = {};

        res = res.split(/[\r\n]+/);
        res.forEach(function (r) {
            r = r.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
            obj[r.shift()] = r;
        });

        for (var type in obj) {
            var ext = obj[type];

            for (var i = 0; i < ext.length; i++) {
                obj[ext[i]] = type;
            }

            delete obj[type];
        }

        cb(null, obj);
    });
};
