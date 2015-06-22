'use strict';

var fs = require('fs');
var mkdir = require('mkdirp');
var path = require('path');
var pipeline = require('stream-combiner');
var rm = require('rimraf');
var tempfile = require('tempfile');

/**
 * Initialize Decompress with options
 *
 * Options:
 *
 *   - `ext` String with file name, MIME type, etc
 *   - `path` Path to extract to
 *   - `strip` Equivalent to --strip-components for tar
 *
 * @param {Object} opts
 * @api private
 */

function Decompress(opts) {
    opts = opts || {};
    this.opts = opts;
    this.path = opts.path || process.cwd();
    this.ext = opts.ext || '';
    this.strip = +opts.strip || 0;
    this.extractors = {
        '.zip': this._extractZip,
        '.tar': this._extractTar,
        '.tar.gz': this._extractTarGz,
        '.tgz': this._extractTarGz,
        'application/zip': this._extractZip,
        'application/x-gzip': this._extractTarGz,
        'application/x-tar': this._extractTar,
        'application/x-tgz': this._extractTarGz
    };
    this.extractor = this._getExtractor(this.ext);
}

/**
 * Extract an archive
 *
 * @api public
 */

Decompress.prototype.extract = function () {
    var self = this;
    var stream = this.extractor();

    if (!fs.existsSync(this.path)) {
        mkdir.sync(self.path);
    }

    return stream;
};

/**
 * Check if a file can be extracted
 *
 * @param {String} src
 * @param {String} mime
 * @api public
 */

Decompress.prototype.canExtract = function (src, mime) {
    if (this._getExtractor(src)) {
        return true;
    }

    if (mime && this._getExtractor(mime)) {
        return true;
    }

    return false;
};

/**
 * Get the extractor for a desired file
 *
 * @param {String} src
 * @api private
 */

Decompress.prototype._getExtractor = function (src) {
    src = src.toLowerCase();
    return this.extractors[src];
};

/**
 * Extract a zip file
 *
 * @api private
 */

Decompress.prototype._extractZip = function () {
    var AdmZip = require('adm-zip');
    var tmp = tempfile('.zip');
    var self = this;
    var stream = fs.createWriteStream(tmp);
    var zip;

    stream.on('close', function () {
        zip = new AdmZip(tmp);

        zip.getEntries().forEach(function (entry) {
            if (!entry.isDirectory) {
                var dest;
                var dir = path.dirname(entry.entryName.toString()).split('/');
                var file = path.basename(entry.rawEntryName.toString());

                if (self.strip) {
                    dir = dir.slice(self.strip);
                }

                dest = path.join(self.path, dir.join(path.sep), file);

                mkdir.sync(path.dirname(dest));
                fs.writeFileSync(dest, entry.getData());

                if (self.opts.mode) {
                    fs.chmodSync(dest, self.opts.mode);
                }
            }
        });

        rm.sync(tmp);
    });

    return stream;
};

/**
 * Extract a tar file
 *
 * @api private
 */

Decompress.prototype._extractTar = function () {
    var tar = require('tar');
    var stream = tar.Extract(this.opts);

    return stream;
};

/**
 * Extract a tar.gz file
 *
 * @api private
 */

Decompress.prototype._extractTarGz = function () {
    var tar = require('tar');
    var zlib = require('zlib');
    var stream = zlib.Unzip();
    var dest = tar.Extract(this.opts);

    return pipeline(stream, dest);
};

/**
 * Module exports
 */

module.exports = function (opts) {
    var decompress = new Decompress(opts);
    return decompress.extract();
};

module.exports.canExtract = function (src, mime) {
    var decompress = new Decompress();
    return decompress.canExtract(src, mime);
};
