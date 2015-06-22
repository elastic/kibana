'use strict';

var fs = require('fs');

/**
 * Check if file is executable
 *
 * @param {String} mode
 * @param {String} gid
 * @param {String} uid
 * @api private
 */

function isExe(mode, gid, uid) {
    var ret;

    if (process.platform === 'win32') {
        ret = true;
    } else {
        ret = (mode & '0001') ||
              (mode & '0010') && process.getgid && gid === process.getgid() ||
              (mode & '0100') && process.getuid && uid === process.getuid();
    }

    return ret;
}

/**
 * Async
 *
 * @param {String} name
 * @param {Function} cb
 * @api public
 */

module.exports = function (name, cb) {
    fs.stat(name, function (err, stats) {
        if (err) {
            return cb(err);
        }

        if (stats && stats.isFile() && isExe(stats.mode, stats.gid, stats.gid)) {
            return cb(null, true);
        }

        return cb(null, false);
    });
};

/**
 * Sync
 *
 * @param {String} name
 * @api public
 */

module.exports.sync = function (name) {
    var file = fs.statSync(name);

    if (file && file.isFile() && isExe(file.mode, file.gid, file.uid)) {
        return true;
    }

    return false;
};
