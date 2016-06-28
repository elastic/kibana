/*jshint esnext:true*/
/*globals module:true, require:true, process:true*/

/**
 * Module dependencies.
 */

// Core.
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var url = require('url');
var zlib = require('zlib');

// Npm.
var knox = require('knox');
var mime = require('mime');
var deferred = require('underscore.deferred');
var Tempfile = require('temporary/lib/file');

// Local
var common = require('./common');

// Avoid warnings.
var existsSync = ('existsSync' in fs) ? fs.existsSync : path.existsSync;

/**
 * Success/error messages.
 */
var MSG_UPLOAD_SUCCESS = '↗'.blue + ' Uploaded: %s (%s)';
var MSG_DOWNLOAD_SUCCESS = '↙'.yellow + ' Downloaded: %s (%s)';
var MSG_DELETE_SUCCESS = '✗'.red + ' Deleted: %s';
var MSG_COPY_SUCCESS = '→'.cyan + ' Copied: %s to %s';
var MSG_SKIP_SUCCESS = '→'.cyan + ' File Exists, skipped: %s';
var MSG_SKIP_MATCHES = '→'.cyan + ' File Matches, skipped: %s';
var MSG_SKIP_OLDER = '→'.cyan + ' File is Old, skipped: %s';

var MSG_UPLOAD_DEBUG = '↗'.blue + ' Upload: ' + '%s'.grey + ' to ' + '%s:%s'.cyan;
var MSG_DOWNLOAD_DEBUG = '↙'.yellow + ' Download: ' + '%s:%s'.cyan + ' to ' + '%s'.grey;
var MSG_DELETE_DEBUG = '✗'.red + ' Delete: ' + '%s:%s'.cyan;
var MSG_COPY_DEBUG = '→'.cyan + ' Copy: ' + '%s'.cyan + ' to ' + '%s:%s'.cyan;
var MSG_SKIP_DEBUG = '→'.cyan + ' Sync: ' + '%s:%s'.cyan;

var MSG_ERR_NOT_FOUND = '¯\\_(ツ)_/¯ File not found: %s';
var MSG_ERR_UPLOAD = 'Upload error: %s (%s)';
var MSG_ERR_DOWNLOAD = 'Download error: %s (%s)';
var MSG_ERR_DELETE = 'Delete error: %s (%s)';
var MSG_ERR_COPY = 'Copy error: %s to %s';
var MSG_ERR_CHECKSUM = '%s error: expected hash: %s but found %s for %s';

exports.init = function (grunt) {
  var async = grunt.util.async;
  var _ = grunt.util._;

  _.mixin(deferred);

  var exports = {};

  /**
   * Create an Error object based off of a formatted message. Arguments
   * are identical to those of util.format.
   *
   * @param {String} Format.
   * @param {...string|number} Values to insert into Format.
   * @returns {Error}
   */
  var makeError = exports.makeError = function () {
    var msg = util.format.apply(util, _.toArray(arguments));
    return new Error(msg);
  };

  var makeOptions = exports.makeOptions = function(opts) {
    var options = _.clone(opts || {}, true);

    return options;
  };

  /**
   * Create an s3 client. Returns an Knox instance.
   *
   * @param {Object} Format.
   * @returns {Object}
   */
  var makeClient = exports.makeClient = function(options) {
    return knox.createClient(_.pick(options, [
      'region', 'endpoint', 'port', 'key', 'secret', 'access', 'bucket', 'secure', 'headers', 'style'
    ]));
  };

  /**
   * Publishes the local file at src to the s3 dest.
   *
   * Verifies that the upload was successful by comparing an md5 checksum of
   * the local and remote versions.
   *
   * @param {String} src The local path to the file to upload.
   * @param {String} dest The s3 path, relative to the bucket, to which the src
   *     is uploaded.
   * @param {Object} [options] An object containing options which override any
   *     option declared in the global s3 config.
   */
  exports.put = exports.upload = function (src, dest, opts) {
    var dfd = new _.Deferred();
    var options = makeOptions(opts);
    var prettySrc = path.relative(process.cwd(), src);

    // Make sure the local file exists.
    if (!existsSync(src)) {
      return dfd.reject(makeError(MSG_ERR_NOT_FOUND, prettySrc));
    }

    var headers = options.headers || {};

    if (options.access) {
      headers['x-amz-acl'] = options.access;
    }

    // Pick out the configuration options we need for the client.
    var client = makeClient(options);

    if (options.debug) {
      return dfd.resolve(util.format(MSG_UPLOAD_DEBUG, prettySrc, client.bucket, dest)).promise();
    }

    // Encapsulate this logic to make it easier to gzip the file first if
    // necesssary.
    var upload = function (cb) {
      cb = cb || function () {};

      // Upload the file to s3.
      client.putFile(src, dest, headers, function (err, res) {
        // If there was an upload error or any status other than a 200, we
        // can assume something went wrong.
        if (err || res.statusCode !== 200) {
          cb(makeError(MSG_ERR_UPLOAD, prettySrc, err || res.statusCode));
        }
        else {
          // Read the local file so we can get its md5 hash.
          fs.readFile(src, function (err, data) {
            if (err) {
              cb(makeError(MSG_ERR_UPLOAD, prettySrc, err));
            }
            else {
              // The etag head in the response from s3 has double quotes around
              // it. Strip them out.
              var remoteHash = res.headers.etag.replace(/"/g, '');

              // Get an md5 of the local file so we can verify the upload.
              var localHash = crypto.createHash('md5').update(data).digest('hex');

              if (remoteHash === localHash) {
                var msg = util.format(MSG_UPLOAD_SUCCESS, prettySrc, localHash);
                cb(null, msg);
              }
              else {
                cb(makeError(MSG_ERR_CHECKSUM, 'Upload', localHash, remoteHash, prettySrc));
              }
            }
          });
        }
        res.resume();
      });
    };

    // prepare gzip exclude option
    var gzipExclude = options.gzipExclude || [];
    if (!_.isArray(gzipExclude)) {
      gzipExclude = [];
    }

    // If gzip is enabled and file not in gzip exclude array,
    // gzip the file into a temp file and then perform the upload.
    if (options.gzip && gzipExclude.indexOf(path.extname(src)) === -1) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Type'] = headers['Content-Type'] || mime.lookup(src);

      var charset = mime.charsets.lookup(headers['Content-Type'], null);
      if (charset) {
        headers['Content-Type'] += '; charset=' + charset;
      }

      var tmp = new Tempfile();
      var input = fs.createReadStream(src);
      var output = fs.createWriteStream(tmp.path);

      // Gzip the file and upload when done.
      input.pipe(zlib.createGzip()).pipe(output)
        .on('error', function (err) {
          dfd.reject(makeError(MSG_ERR_UPLOAD, prettySrc, err));
        })
        .on('close', function () {
          // Update the src to point to the newly created .gz file.
          src = tmp.path;
          prettySrc += ' (gzip)';
          upload(function (err, msg) {
            // Clean up the temp file.
            tmp.unlinkSync();

            if (err) {
              dfd.reject(err);
            }
            else {
              dfd.resolve(msg);
            }
          });
        });
    }
    else {
      // No need to gzip so go ahead and upload the file.
      upload(function (err, msg) {
        if (err) {
          dfd.reject(err);
        }
        else {
          dfd.resolve(msg);
        }
      });
    }

    return dfd.promise();
  };

  /**
   * Download a file from s3.
   *
   * Verifies that the download was successful by downloading the file and
   * comparing an md5 checksum of the local and remote versions.
   *
   * @param {String} src The s3 path, relative to the bucket, of the file being
   *     downloaded.
   * @param {String} dest The local path where the download will be saved.
   * @param {Object} [options] An object containing options which override any
   *     option declared in the global s3 config.
   */
  exports.pull = exports.download = function (src, dest, opts) {
    var dfd = new _.Deferred();
    var options = makeOptions(opts);

    // Pick out the configuration options we need for the client.
    var client = makeClient(options);

    if (options.debug) {
      return dfd.resolve(util.format(MSG_DOWNLOAD_DEBUG, client.bucket, src, path.relative(process.cwd(), dest))).promise();
    }

    // Create a local stream we can write the downloaded file to.
    var file = fs.createWriteStream(dest);

    // Upload the file to s3.
    client.getFile(src, function (err, res) {
      // If there was an upload error or any status other than a 200, we
      // can assume something went wrong.
      if (err || res.statusCode !== 200) {
        return dfd.reject(makeError(MSG_ERR_DOWNLOAD, src, err || res.statusCode));
      }

      res
        .on('data', function (chunk) {
          file.write(chunk);
        })
        .on('error', function (err) {
          return dfd.reject(makeError(MSG_ERR_DOWNLOAD, src, err));
        })
        .on('end', function () {
          file.end();

          // Read the local file so we can get its md5 hash.
          fs.readFile(dest, function (err, data) {
            if (err) {
              return dfd.reject(makeError(MSG_ERR_DOWNLOAD, src, err));
            }
            else {
              // The etag head in the response from s3 has double quotes around
              // it. Strip them out.
              var remoteHash = res.headers.etag.replace(/"/g, '');

              // Get an md5 of the local file so we can verify the download.
              var localHash = crypto.createHash('md5').update(data).digest('hex');

              if (remoteHash === localHash) {
                var msg = util.format(MSG_DOWNLOAD_SUCCESS, src, localHash);
                dfd.resolve(msg);
              }
              else {
                dfd.reject(makeError(MSG_ERR_CHECKSUM, 'Download', localHash, remoteHash, src));
              }
            }
          });
        });
    });

    return dfd.promise();
  };

  /**
   * Copy a file from s3 to s3.
   *
   * @param {String} src The s3 path, including the bucket, to the file to
   *     copy.
   * @param {String} dest The s3 path, relative to the bucket, to the file to
   *     create.
   * @param {Object} [options] An object containing options which override any
   *     option declared in the global s3 config.
   */
  exports.copy = function (src, dest, opts) {
    var dfd = new _.Deferred();
    var options = makeOptions(opts);

    // Pick out the configuration options we need for the client.
    var client = makeClient(options);

    if (options.debug) {
      return dfd.resolve(util.format(MSG_COPY_DEBUG, src, client.bucket, dest)).promise();
    }

    var headers = {
      'Content-Length': 0,
      'x-amz-copy-source': src
    };

    if (options.headers) {
      _(headers).extend(options.headers);
      headers['x-amz-metadata-directive'] = 'REPLACE';
    }

    // Copy the src file to dest.
    var req = client.put(dest, headers);

    req.on('response', function (res) {
      if (res.statusCode !== 200) {
        dfd.reject(makeError(MSG_ERR_COPY, src, dest));
      }
      else {
        dfd.resolve(util.format(MSG_COPY_SUCCESS, src, dest));
      }
    });

    return dfd.promise();
  };

  /**
   * Delete a file from s3.
   *
   * @param {String} src The s3 path, relative to the bucket, to the file to
   *     delete.
   * @param {Object} [options] An object containing options which override any
   *     option declared in the global s3 config.
   */
  exports.del = function (src, opts) {
    var dfd = new _.Deferred();
    var options = makeOptions(opts);

    // Pick out the configuration options we need for the client.
    var client = makeClient(options);

    if (options.debug) {
      return dfd.resolve(util.format(MSG_DELETE_DEBUG, client.bucket, src)).promise();
    }

    // Upload the file to this endpoint.
    client.deleteFile(src, function (err, res) {
      if (err || res.statusCode !== 204) {
        dfd.reject(makeError(MSG_ERR_DELETE, src, err || res.statusCode));
      }
      else {
        dfd.resolve(util.format(MSG_DELETE_SUCCESS, src));
      }
    });

    return dfd.promise();
  };



  /**
   * Publishes the local file at src to the s3 dest, but only after checking if the file exists or doesn't match.
   *
   * Verifies that the upload was successful by comparing an md5 checksum of
   * the local and remote versions. Also checks if the file exists first, both by filename or by hash and mtime
   *
   * @param {String} src The local path to the file to upload.
   * @param {String} dest The s3 path, relative to the bucket, to which the src
   *     is uploaded.
   * @param {Object} [options] An object containing options which override any
   *     option declared in the global s3 config.
   */
  exports.sync = function (src, dest, opts) {
    var dfd = new _.Deferred();
    var options = makeOptions(opts);
    var prettySrc = path.relative(process.cwd(), src);

    // Pick out the configuration options we need for the client.
    var client = makeClient(options);

    if (options.debug) {
      return dfd.resolve(util.format(MSG_SKIP_DEBUG, client.bucket, prettySrc)).promise();
    }

    // Check for the file on s3
    // verify was truthy, so we need to make sure that this file is actually the file it thinks it is
    client.headFile( dest, function(err, res) {
      var upload;

      // If the file was not found, then we should be able to continue with a normal upload procedure
      if (res && res.statusCode === 404) {
        upload = exports.upload( src, dest, opts);
        // pass through the dfd state
        return upload.then( dfd.resolve, dfd.reject );
      }

      if (!res || err || res.statusCode !== 200 ) {
        return dfd.reject(makeError(MSG_ERR_DOWNLOAD, prettySrc, err || res.statusCode));
      }

      // we do not wish to overwrite a file that exists by verifying we have a newer one in place
      if( !options.verify ) {
        // the file exists so do nothing with that
        return dfd.resolve(util.format(MSG_SKIP_SUCCESS, prettySrc));
      }

      // the file exists so let's check to make sure it's the right file, if not, we'll update it
      // Read the local file so we can get its md5 hash.
      fs.readFile(src, function (err, data) {
        var remoteHash, localHash;

        if (err) {
          return dfd.reject(makeError(MSG_ERR_UPLOAD, prettySrc, err));
        }
        // The etag head in the response from s3 has double quotes around
        // it. Strip them out.
        remoteHash = res.headers.etag.replace(/"/g, '');

        // Get an md5 of the local file so we can verify the upload.
        localHash = crypto.createHash('md5').update(data).digest('hex');

        if (remoteHash === localHash) {
          // the file exists and is the same so do nothing with that
          return dfd.resolve(util.format(MSG_SKIP_MATCHES, prettySrc));
        }

        fs.stat( src, function(err, stats) {
          var remoteWhen, localWhen, upload;

          if (err) {
            return dfd.reject(makeError(MSG_ERR_UPLOAD, prettySrc, err));
          }

          // which one is newer? if local is newer, we should upload it
          remoteWhen = new Date(res.headers['last-modified'] || "0"); // earliest date possible if no header is returned
          localWhen = new Date(stats.mtime || "1"); // make second earliest date possible if mtime isn't set

          if ( localWhen <= remoteWhen ) {
            // Remote file was older
            return dfd.resolve(util.format(MSG_SKIP_OLDER, prettySrc));
          }

          // default is that local is newer, only upload when it is
          upload = exports.upload( src, dest, opts);
          // pass through the dfd state
          upload.then( dfd.resolve, dfd.reject );
        });
      });
    }).end();

    return dfd.promise();
  };

  return exports;
};
