'use strict';

var fs = require('fs');
var path = require('path');

/**
 * Search for a file in an array of paths
 *
 * Options:
 *
 *   - `path` Paths to search in
 *   - `exclude` Paths to exclude
 *   - `global` Whether to search in `PATH`
 *
 * @param {String} name
 * @param {Object} opts
 * @api public
 */

module.exports = function (name, opts) {
    var file;

    opts = opts || {};
    opts.path = Array.isArray(opts.path) ? opts.path : [opts.path];
    opts.global = opts.global !== false;

    if (opts.global) {
        opts.path = opts.path.concat(process.env.PATH.split(path.delimiter));
    }

    if (opts.exclude) {
        opts.exclude = Array.isArray(opts.exclude) ? opts.exclude : [opts.exclude];
    }

    file = opts.path.map(function (dir) {
        if (dir && opts.exclude) {
            if (dir.indexOf(opts.exclude) === -1) {
                return path.join(dir, name);
            }
        } else if (dir) {
            return path.join(dir, name);
        }
    }).filter(fs.existsSync);

    if (!file.length) {
        return null;
    }

    return file;
};
