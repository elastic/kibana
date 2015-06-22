'use strict';

var binCheck = require('bin-check');
var events = require('events');
var exec = require('child_process').exec;
var executable = require('executable');
var findFile = require('find-file');
var merge = require('mout/object/merge');
var path = require('path');
var rm = require('rimraf');
var set = require('mout/object/set');
var tempfile = require('tempfile');
var util = require('util');

/**
 * Initialize BinWrapper with options
 *
 * Options:
 *
 *   - `bin` The name of the binary
 *   - `dest` Where to download the binary
 *   - `version` Version of the binary
 *   - `global` Whether to check for global binaries or not
 *
 * @param {Object} opts
 * @api public
 */

function BinWrapper(opts) {
    events.EventEmitter.call(this);
    opts = opts || {};
    this.opts = opts;
    this.bin = opts.bin;

    if (process.platform === 'win32' && path.extname(this.bin) === '') {
        this.bin = this.bin + '.exe';
    }

    this.files = {};
    this.urls = { name: this.bin };
    this.dest = opts.dest || process.cwd();
    this.global = opts.global !== false;
    this.paths = [this.dest];
    this.path = this._find(this.bin) || path.join(this.dest, this.bin);
}

/**
 * Inherit from `events.EventEmitter`
 */

util.inherits(BinWrapper, events.EventEmitter);

/**
 * Check if a binary is present and working
 *
 * @param {String|Array} cmd
 * @api public
 */

BinWrapper.prototype.check = function (cmd) {
    var file = this._parse(this.files);
    var global = this._find(this.bin);
    var self = this;
    var url = this._parse(this.urls);

    cmd = cmd || ['--help'];
    cmd = Array.isArray(cmd) ? cmd : [cmd];

    if (global) {
        return this._test(global, cmd);
    }

    var dl = Object.getOwnPropertyNames(file).length !== 0 ? [].concat(url, file) : url;

    this._download(dl, this.dest, {
        mode: '0755'
    }).once('data', function () {
        self.emit('download');
    }).on('close', function () {
        return self._test(path.join(self.dest, self.bin), cmd);
    });

    return this;
};

/**
 * Download source and build a binary
 *
 * @param {String|Array} cmd
 * @api public
 */

BinWrapper.prototype.build = function (cmd) {
    var self = this;
    var tmp = tempfile();
    var dl = this._download(this.src, tmp, {
        mode: '0777',
        extract: true,
        strip: 1
    });

    dl.on('close', function () {
        exec(cmd, { cwd: tmp }, function (err) {
            if (err) {
                self.emit('error', err);
            }

            rm(tmp, function () {
                self.emit('finish');
            });
        });
    });

    return this;
};

/**
 * Add a path to check
 *
 * @param {String} src
 * @api public
 */

BinWrapper.prototype.addPath = function (src) {
    this.paths.push(src);
    return this;
};

/**
 * Add a URL to download
 *
 * @param {String} url
 * @param {String} platform
 * @param {String} arch
 * @api public
 */

BinWrapper.prototype.addUrl = function (url, platform, arch) {
    var tmp = {};

    if (platform && arch) {
        set(tmp, 'platform.' + [platform] + '.arch.' + [arch] + '.url', url);
        this.urls = merge(this.urls, tmp);
        return this;
    }

    if (platform) {
        set(tmp, 'platform.' + [platform] + '.url', url);
        this.urls = merge(this.urls, tmp);
        return this;
    }

    this.urls.url = url;
    return this;
};

/**
 * Add a file URL to download
 *
 * @param {String|Object} url
 * @param {String} platform
 * @param {String} arch
 * @api public
 */

BinWrapper.prototype.addFile = function (url, platform, arch) {
    var name = path.basename(url);
    var tmp = {};

    if (url.url && url.name) {
        name = url.name;
        url = url.url;
    }

    if (platform && arch) {
        set(tmp, 'platform.' + [platform] + '.arch.' + [arch] + '.name', name);
        set(tmp, 'platform.' + [platform] + '.arch.' + [arch] + '.url', url);
        this.files = merge(this.files, tmp);
        return this;
    }

    if (platform) {
        set(tmp, 'platform.' + [platform] + '.name', name);
        set(tmp, 'platform.' + [platform] + '.url', url);
        this.files = merge(this.files, tmp);
        return this;
    }

    this.files.name = name;
    this.files.url = url;
    return this;
};


/**
 * Add a URL to source code
 *
 * @param {String} url
 * @api public
 */

BinWrapper.prototype.addSource = function (url) {
    this.src = url;
    return this;
};

/**
 * Find binary and check if it's executable
 *
 * @param {String} bin
 * @api private
 */

BinWrapper.prototype._find = function (bin) {
    var opts = { path: this.paths, exclude: 'node_modules/.bin' };

    if (!this.global) {
        opts.global = false;
    }

    var file = findFile(bin, opts);

    if (file) {
        if (executable.sync(file[0])) {
            return file[0];
        }
    }

    return false;
};

/**
 * Check if a binary is working by checking its exit code
 *
 * @param {String} bin
 * @param {Array} cmd
 * @api private
 */

BinWrapper.prototype._test = function (bin, cmd) {
    var self = this;

    binCheck(bin, cmd, function (err, works) {
        if (err) {
            self.emit('error', err);
        }

        if (self.opts.version && works) {
            binCheck(bin, '--version', function (err, works, msg) {
                if (msg) {
                    self.emit(msg.indexOf(self.opts.version) !== -1 ? 'success' : 'fail');
                } else {
                    self.emit('success');
                }
            });
        } else {
            self.emit(works ? 'success' : 'fail');
        }
    });

    return this;
};

/**
 * Download
 *
 * @param {String|Object} url
 * @param {String} dest
 * @param {Object} opts
 * @api private
 */

BinWrapper.prototype._download = function (url, dest, opts) {
    var proxy = process.env.http_proxy ||
                process.env.HTTP_PROXY ||
                process.env.https_proxy ||
                process.env.HTTPS_PROXY ||
                null;

    opts.proxy = proxy;

    var download = require('download');
    var dl = download(url, dest, opts);
    var self = this;

    dl.on('error', function (err) {
        self.emit('error', err);
    });

    return dl;
};

/**
 * Parse object
 *
 * @param {Object} opts
 * @api private
 */

BinWrapper.prototype._parse = function (opts) {
    var platform = process.platform;
    var arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm' ? 'arm' : 'x86';

    if (opts.platform && opts.platform.hasOwnProperty([platform])) {
        opts = merge(opts, opts.platform[platform]);
    }

    if (opts.arch && opts.arch.hasOwnProperty([arch])) {
        opts = merge(opts, opts.arch[arch]);
    }

    delete opts.platform;
    delete opts.arch;

    return opts;
};

/**
 * Module exports
 */

module.exports = BinWrapper;
