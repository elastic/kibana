/*jslint node: true */
'use strict';

var through2    = require('through2');
var PluginError = require('gulp-util').PluginError;
var utils       = require('./lib/utils');
var bufferMode  = require('./lib/bufferMode');
var streamMode  = require('./lib/streamMode');

var PLUGIN_NAME = 'gulp-gzip';

module.exports = function (options) {

  // Combine user defined options with default options
  var config = utils.merge({ append: true, threshold: false, gzipOptions: {} }, options);

  // Create a through2 object stream. This is our plugin export
  var stream = through2.obj(compress);

  // Expose the config so we can test it
  stream.config = config;

  function compress(file, enc, done) {

    /*jshint validthis: true */
    var self = this;

    // Check for empty file
    if (file.isNull()) {
      // Pass along the empty file to the next plugin
      self.push(file);
      done();
      return;
    }

    // Call when finished with compression
    var finished = function(err, contents, wasCompressed) {
      if (err) {
        var error = new PluginError(PLUGIN_NAME, err, { showStack: true });
        self.emit('error', error);
        done();
        return;
      }

      if (wasCompressed) {
        if (file.contentEncoding) {
          file.contentEncoding.push('gzip');
        } else {
          file.contentEncoding = [ 'gzip' ];
        }
        if (config.extension) {
            file.path += '.' + config.extension;
        } else if (config.preExtension) {
            file.path = file.path.replace(/(\.[^\.]+)$/, '.' + config.preExtension + '$1');
        } else if (config.append) {
          file.path += '.gz';
        }
      }
      file.contents = contents;
      self.push(file);
      done();
      return;
    };

    // Check if file contents is a buffer or a stream
    if (file.isBuffer()) {
      bufferMode(file.contents, config, finished);
    } else {
      streamMode(file.contents, config, finished);
    }
  }

  return stream;
};
