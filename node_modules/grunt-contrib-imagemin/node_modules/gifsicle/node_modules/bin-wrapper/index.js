'use strict';

var binCheck = require('bin-check');
var find = require('find-file');
var path = require('path');

/**
 * Initialize a new `BinWrapper` with opts
 *
 * @param {Object} opts
 * @api public
 */

function BinWrapper(opts) {
    if (!(this instanceof BinWrapper)) {
        return new BinWrapper();
    }

    opts = opts || {};
    this.opts = opts;
    this.global = opts.global !== false;
    this._src = [];
}

/**
 * Define a binary to download
 *
 * @param {String} src
 * @param {String} os
 * @param {String} arch
 * @api public
 */

BinWrapper.prototype.src = function (src, os, arch) {
    if (!arguments.length) {
        return this._src;
    }

    var obj = { url: src, name: path.basename(src) };

    if (os) {
        obj.os = os;
    }

    if (arch) {
        obj.arch = arch;
    }

    this._src = this._src.concat(obj);
    return this;
};

/**
 * Define where to download the binary to
 *
 * @param {String} str
 * @api public
 */

BinWrapper.prototype.dest = function (str) {
    if (!arguments.length) {
        return this._dest;
    }

    this._dest = str;
    return this;
};

/**
 * Define which file to use as a binary
 *
 * @param {String} str
 * @api public
 */

BinWrapper.prototype.use = function (str) {
    if (!arguments.length) {
        return this._use;
    }

    var opts = { path: this.dest(), global: this.global, exclude: 'node_modules/.bin' };
    var bin = find(str, opts);

    if (bin && bin.length > 0) {
        this._use = bin[0];
    } else {
        this._use = path.join(this.dest(), str);
    }

    return this;
};

/**
 * Run
 *
 * @param {Array} cmd
 * @param {Function} cb
 * @api public
 */

BinWrapper.prototype.run = function (cmd, cb) {
    var download = require('download');
    var self = this;

    this.parse(this.src());
    this.test(cmd, function (err) {
        if (err) {
            return download(self.src(), self.dest(), { mode: '0755' })
                .on('error', function (err) {
                    return cb(err);
                })
                .on('close', function () {
                    self.test(cmd, function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb();
                    });
                });
        }

        cb();
    });
};

/**
 * Test
 *
 * @param {Array} cmd
 * @param {Function} cb
 * @api public
 */

BinWrapper.prototype.test = function (cmd, cb) {
    var self = this;

    if (this.use()) {
        return binCheck(self.use(), cmd, function (err, works) {
            if (err) {
                return cb(err);
            }

            if (!works) {
                return cb('command failed');
            }

            cb();
        });
    }

    cb('no binary found');
};

/**
 * Parse
 *
 * @param {Object} obj
 * @api public
 */

BinWrapper.prototype.parse = function (obj) {
    var arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm' ? 'arm' : 'x86';
    var ret = [];

    obj.filter(function (o) {
        if (o.os && o.os === process.platform && o.arch && o.arch === arch) {
            return ret.push(o);
        } else if (o.os && o.os === process.platform && !o.arch) {
            return ret.push(o);
        } else if (!o.os && !o.arch) {
            return ret.push(o);
        }
    });

    this._src = ret;
    return this;
};

/**
 * Module exports
 */

module.exports = BinWrapper;
