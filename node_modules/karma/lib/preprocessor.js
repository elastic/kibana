var path = require('path');
var fs = require('graceful-fs');
var crypto = require('crypto');
var mm = require('minimatch');

var log = require('./logger').create('preprocess');

var sha1 = function(data) {
  var hash = crypto.createHash('sha1');
  hash.update(data);
  return hash.digest('hex');
};

var isBinary = Object.create(null);
[
  'adp', 'au', 'mid', 'mp4a', 'mpga', 'oga', 's3m', 'sil', 'eol', 'dra', 'dts', 'dtshd', 'lvp',
  'pya', 'ecelp4800', 'ecelp7470', 'ecelp9600', 'rip', 'weba', 'aac', 'aif', 'caf', 'flac', 'mka',
  'm3u', 'wax', 'wma', 'wav', 'xm', 'flac', '3gp', '3g2', 'h261', 'h263', 'h264', 'jpgv', 'jpm',
  'mj2', 'mp4', 'mpeg', 'ogv', 'qt', 'uvh', 'uvm', 'uvp', 'uvs', 'dvb', 'fvt', 'mxu', 'pyv', 'uvu',
  'viv', 'webm', 'f4v', 'fli', 'flv', 'm4v', 'mkv', 'mng', 'asf', 'vob', 'wm', 'wmv', 'wmx', 'wvx',
  'movie', 'smv', 'bmp', 'cgm', 'g3', 'gif', 'ief', 'jpg', 'jpeg', 'ktx', 'png', 'btif',
  'sgi', 'tiff', 'psd', 'uvi', 'sub', 'djvu', 'dwg', 'dxf', 'fbs', 'fpx', 'fst', 'mmr',
  'rlc', 'mdi', 'wdp', 'npx', 'wbmp', 'xif', 'webp', '3ds', 'ras', 'cmx', 'fh', 'ico', 'pcx', 'pic',
  'pnm', 'pbm', 'pgm', 'ppm', 'rgb', 'tga', 'xbm', 'xpm', 'xwd', 'xz', 'zip', 'rar', 'tar', 'tbz2',
  'tgz', 'txz', 'bz2', 'eot', 'ttf', 'woff', 'dat', 'nexe', 'pexe', 'epub', 'gz', 'mp3', 'ogg',
  'swf', 'mem'
].forEach(function(extension) {
  isBinary['.' + extension] = true;
});

// TODO(vojta): instantiate preprocessors at the start to show warnings immediately
var createPreprocessor = function(config, basePath, injector) {
  var patterns = Object.keys(config);
  var alreadyDisplayedWarnings = Object.create(null);

  return function(file, done) {
    var thisFileIsBinary = isBinary[path.extname(file.originalPath)];
    var preprocessors = [];
    var nextPreprocessor = function(error, content) {
      // normalize B-C
      if (arguments.length === 1 && typeof error === 'string') {
        content = error;
        error = null;
      }

      if (error) {
        file.content = null;
        file.contentPath = null;
        return done(error);
      }

      if (!preprocessors.length) {
        file.contentPath = null;
        file.content = content;
        file.sha = sha1(content);
        return done();
      }

      preprocessors.shift()(content, file, nextPreprocessor);
    };
    var instantiatePreprocessor = function(name) {
      if (alreadyDisplayedWarnings[name]) {
        return;
      }

      try {
        preprocessors.push(injector.get('preprocessor:' + name));
      } catch (e) {
        if (e.message.indexOf('No provider for "preprocessor:' + name + '"') !== -1) {
          log.warn('Can not load "%s", it is not registered!\n  ' +
                   'Perhaps you are missing some plugin?', name);
        } else {
          log.warn('Can not load "%s"!\n  ' + e.stack, name);
        }

        alreadyDisplayedWarnings[name] = true;
      }
    };

    // collects matching preprocessors
    // TODO(vojta): should we cache this ?
    for (var i = 0; i < patterns.length; i++) {
      if (mm(file.originalPath, patterns[i])) {
        if (thisFileIsBinary) {
          log.warn('Ignoring preprocessing (%s) %s because it is a binary file.',
              config[patterns[i]].join(', '), file.originalPath);
        } else {
          config[patterns[i]].forEach(instantiatePreprocessor);
        }
      }
    }

    return fs.readFile(file.originalPath, function(err, buffer) {
      if (err) {
        throw err;
      }
      nextPreprocessor(null, thisFileIsBinary ? buffer : buffer.toString());
    });
  };
};
createPreprocessor.$inject = ['config.preprocessors', 'config.basePath', 'injector'];

exports.createPreprocessor = createPreprocessor;
