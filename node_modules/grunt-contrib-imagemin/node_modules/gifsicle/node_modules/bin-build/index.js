'use strict';

var exec = require('child_process').exec;
var rm = require('rimraf');
var tempfile = require('tempfile');

/**
 * Initialize new `BinBuild`
 *
 * @api public
 */

function BinBuild() {
    if (!(this instanceof BinBuild)) {
        return new BinBuild();
    }
}

/**
 * Define the source archive to download
 *
 * @param {String} str
 * @api public
 */

BinBuild.prototype.src = function (str) {
    if (!arguments.length) {
        return this._src;
    }

    this._src = str;
    return this;
};

/**
 * Configure
 *
 * @param {String} str
 * @api public
 */

BinBuild.prototype.cfg = function (str) {
    if (!arguments.length) {
        return this._cfg;
    }

    this._cfg = str;
    return this;
};

/**
 * Make
 *
 * @param {String} str
 * @api public
 */

BinBuild.prototype.make = function (str) {
    if (!arguments.length) {
        return this._make;
    }

    this._make = str;
    return this;
};

/**
 * Build
 *
 * @param {Function} cb
 * @api public
 */

BinBuild.prototype.build = function (cb) {
    var download = require('download');
    var str;
    var tmp = tempfile();

    if (this.cfg() && this.make()) {
        str = this.cfg() + ' && ' + this.make();
    } else if (!this.cfg() && this.make()) {
        str = this.make();
    } else {
        cb();
    }

    download(this.src(), tmp, { strip: 1, extract: true })
        .on('error', cb)
        .on('close', function () {
            exec(str, { cwd: tmp }, function (err) {
                if (err) {
                    return cb(err);
                }

                rm(tmp, cb);
            });
        });
};

/**
 * Module exports
 */

module.exports = BinBuild;
