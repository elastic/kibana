'use strict';
/*
 * grunt
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * https://github.com/gruntjs/grunt/blob/master/LICENSE-MIT
 */

// Nodejs libs.
var fs = require('fs');
var path = require('path');

// The module to be exported.
module.exports = File;

// External libs.
var rimraf = require('rimraf');
var iconv = require('iconv-lite');
var glob = require('glob');
var minimatch = require('minimatch');
var isBinaryFile = require('isbinaryfile');
var _ = require('lodash');

var fquery = require('./query');
var defaultLogger = require('./logger');

// Windows?
var win32 = process.platform === 'win32';

// Normalize \\ paths to / paths.
var unixifyPath = function(filepath) {
  if (win32) {
    return filepath.replace(/\\/g, '/');
  } else {
    return filepath;
  }
};

function File(opt) {
  if (!opt) {
    opt = {};
  }

  this._options = _.defaults(opt, {
    write: true,
    encoding: 'utf8',
    logger: defaultLogger
  });

  Object.defineProperty(this, 'log', {
    get: function() {
      return this.option('logger');
    }
  });
}

// Get or set options
File.prototype.option = function( key, val ) {
  if (arguments.length < 2) {
    return this._options[key];
  } else {
    return this._options[key] = val;
  }
};

// Process specified wildcard glob patterns or filenames against a
// callback, excluding and uniquing files in the result set.
var processPatterns = function(patterns, fn) {
  // Filepaths to return.
  var result = [];
  // Iterate over flattened patterns array.
  _.flatten(patterns).forEach(function(pattern) {
    // If the first character is ! it should be omitted
    var exclusion = pattern.indexOf('!') === 0;
    // If the pattern is an exclusion, remove the !
    if (exclusion) { pattern = pattern.slice(1); }
    // Find all matching files for this pattern.
    var matches = fn(pattern);
    if (exclusion) {
      // If an exclusion, remove matching files.
      result = _.difference(result, matches);
    } else {
      // Otherwise add matching files.
      result = _.union(result, matches);
    }
  });
  return result;
};

// Match a filepath or filepaths against one or more wildcard patterns. Returns
// all matching filepaths.
File.prototype.match = function(options, patterns, filepaths) {
  if (!_.isPlainObject(options)) {
    filepaths = patterns;
    patterns = options;
    options = {};
  }

  // Return empty set if either patterns or filepaths was omitted.
  if (patterns == null || filepaths == null) { return []; }
  // Normalize patterns and filepaths to arrays.
  if (!Array.isArray(patterns)) { patterns = [patterns]; }
  if (!Array.isArray(filepaths)) { filepaths = [filepaths]; }
  // Return empty set if there are no patterns or filepaths.
  if (patterns.length === 0 || filepaths.length === 0) { return []; }
  // Return all matching filepaths.
  return processPatterns(patterns, function(pattern) {
    return minimatch.match(filepaths, pattern, options);
  }.bind(this));
};

// Match a filepath or filepaths against one or more wildcard patterns. Returns
// true if any of the patterns match.
File.prototype.isMatch = function() {
  return this.match.apply(this, arguments).length > 0;
};

// Return an array of all file paths that match the given wildcard patterns.
File.prototype.expand = function() {
  var args = _.toArray(arguments);
  // If the first argument is an options object, save those options to pass
  // into the File.prototype.glob.sync method.
  var options = _.isPlainObject(args[0]) ? args.shift() : {};
  // Use the first argument if it's an Array, otherwise convert the arguments
  // object to an array and use that.
  var patterns = Array.isArray(args[0]) ? args[0] : args;
  // Return empty set if there are no patterns or filepaths.
  if (patterns.length === 0) { return []; }
  // Return all matching filepaths.
  var matches = processPatterns(patterns, function(pattern) {
    // Find all matching files for this pattern.
    return glob.sync(pattern, options);
  }.bind(this));
  // Filter result set?
  if (options.filter) {
    matches = matches.filter(function(filepath) {
      filepath = path.join(options.cwd || '', filepath);
      try {
        if (typeof options.filter === 'function') {
          return options.filter(filepath);
        } else {
          // If the file is of the right type and exists, this should work.
          return fs.statSync(filepath)[options.filter]();
        }
      } catch(e) {
        // Otherwise, it's probably not the right type.
        return false;
      }
    });
  }
  return matches;
};

var pathSeparatorRe = /[\/\\]/g;

// Build a multi task "files" object dynamically.
File.prototype.expandMapping = function(patterns, destBase, options) {
  options = _.defaults({}, options, {
    rename: function(destBase, destPath) {
      return path.join(destBase || '', destPath);
    }
  });
  var files = [];
  var fileByDest = {};
  // Find all files matching pattern, using passed-in options.
  this.expand(options, patterns).forEach(function(src) {
    var destPath = src;
    // Flatten?
    if (options.flatten) {
      destPath = path.basename(destPath);
    }
    // Change the extension?
    if (options.ext) {
      destPath = destPath.replace(/(\.[^\/]*)?$/, options.ext);
    }
    // Generate destination filename.
    var dest = options.rename(destBase, destPath, options);
    // Prepend cwd to src path if necessary.
    if (options.cwd) { src = path.join(options.cwd, src); }
    // Normalize filepaths to be unix-style.
    dest = dest.replace(pathSeparatorRe, '/');
    src = src.replace(pathSeparatorRe, '/');
    // Map correct src path to dest path.
    if (fileByDest[dest]) {
      // If dest already exists, push this src onto that dest's src array.
      fileByDest[dest].src.push(src);
    } else {
      // Otherwise create a new src-dest file mapping object.
      files.push({
        src: [src],
        dest: dest,
      });
      // And store a reference for later use.
      fileByDest[dest] = files[files.length - 1];
    }
  });
  return files;
};

// Like mkdir -p. Create a directory and any intermediary directories.
File.prototype.mkdir = function(dirpath, mode) {
  if (!this.option('write')) { return; }
  // Set directory mode in a strict-mode-friendly way.
  if (mode == null) {
    mode = parseInt('0777', 8) & (~process.umask());
  }
  dirpath.split(pathSeparatorRe).reduce(function(parts, part) {
    parts += part + '/';
    var subpath = path.resolve(parts);
    if (!File.prototype.exists.call(null, subpath)) {
      try {
        fs.mkdirSync(subpath, mode);
      } catch(e) {
        throw new Error('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
      }
    }
    return parts;
  }.bind(this), '');
};

// Recurse into a directory, executing callback for each file.
File.prototype.recurse = function(rootdir, callback, subdir) {
  var abspath = subdir ? path.join(rootdir, subdir) : rootdir;
  fs.readdirSync(abspath).forEach(function(filename) {
    var filepath = path.join(abspath, filename);
    if (fs.statSync(filepath).isDirectory()) {
      this.recurse(rootdir, callback, unixifyPath(path.join(subdir || '', filename || '')));
    } else {
      callback(unixifyPath(filepath), rootdir, subdir, filename);
    }
  }.bind(this));
};

// Read a file, return its contents.
File.prototype.read = function(filepath, options) {
  if (!options) { options = {}; }
  var contents;
  try {
    contents = fs.readFileSync(filepath);
    // If encoding is not explicitly null, convert from encoded buffer to a
    // string. If no encoding was specified, use the default.
    if (options.encoding !== null) {
      contents = iconv.decode(contents, options.encoding || this.option('encoding'));
      // Strip any BOM that might exist.
      if (contents.charCodeAt(0) === 0xFEFF) {
        contents = contents.substring(1);
      }
    }
    return contents;
  } catch(e) {
    throw new Error('Unable to read "' + filepath + '" file (Error code: ' + e.code + ').', e);
  }
};

// Read a file, parse its contents, return an object.
File.prototype.readJSON = function(filepath, options) {
  var src = this.read(filepath, options);
  var result;
  try {
    result = JSON.parse(src);
    return result;
  } catch(e) {
    throw new Error('Unable to parse "' + filepath + '" file (' + e.message + ').', e);
  }
};

// Write a file.
File.prototype.write = function(filepath, contents, options) {
  if (!options) { options = {}; }
  var nowrite = !this.option('write');
  this.log.write((nowrite ? 'Not actually writing ' : 'Writing ') + filepath + '...');
  // Create path, if necessary.
  this.mkdir(path.dirname(filepath));
  try {
    // If contents is already a Buffer, don't try to encode it. If no encoding
    // was specified, use the default.
    if (!Buffer.isBuffer(contents)) {
      contents = iconv.encode(contents, options.encoding || this.option('encoding'));
    }
    // Actually write file.
    if (!nowrite) {
      fs.writeFileSync(filepath, contents, { mode: options.mode });
    }
    return true;
  } catch(e) {
    throw new Error('Unable to write "' + filepath + '" file (Error code: ' + e.code + ').', e);
  }
};

// Read a file, optionally processing its content, then write the output.
File.prototype.copy = function(srcpath, destpath, options) {
  if (!options) { options = {}; }
  // If a process function was specified, and noProcess isn't true or doesn't
  // match the srcpath, process the file's source.
  var process = options.process && options.noProcess !== true &&
    !(options.noProcess && this.isMatch(options.noProcess, srcpath));
  // If the file will be processed, use the encoding as-specified. Otherwise,
  // use an encoding of null to force the file to be read/written as a Buffer.
  if (options.encoding === undefined && !isBinaryFile(srcpath)) {
    options.encoding = this.option('encoding');
  }
  var readWriteOptions = process ? options : _.extend({
    encoding: null,
    mode: fs.statSync(srcpath).mode
  }, options);
  // Actually read the file.
  var contents = this.read(srcpath, readWriteOptions);
  if (process) {
    this.log.write('Processing source...');
    try {
      contents = options.process(contents, srcpath);
    } catch(e) {
      throw new Error('Error while processing "' + srcpath + '" file.', e);
    }
  }

  // Abort copy if the process function returns false.
  if (contents === false) {
    this.log.write('Write aborted.');
  } else {
    this.write(destpath, contents, readWriteOptions);
  }
};

// Delete folders and files recursively
File.prototype.delete = function(filepath, options) {
  var nowrite = !this.option('write');
  if (!options) {
    options = {force: this.option('force') || false};
  }

  this.log.write((nowrite ? 'Not actually deleting ' : 'Deleting ') + filepath + '...');

  if (!File.prototype.exists.call(null, filepath)) {
    this.log.warn('Cannot delete nonexistent file.');
    return false;
  }

  // Only delete cwd or outside cwd if --force enabled. Be careful, people!
  if (!options.force) {
    var base = this._base;
    if (_.isFunction(this._base)) {
      base = this._base();
    }
    if (!this._base) {
      base = '';
    }
    base = path.resolve(base);
    if (fquery.isPathCwd(filepath)) {
      this.log.warn('Cannot delete the current working directory.');
      return false;
    } else if (!fquery.doesPathContain(base, filepath)) {
      this.log.warn('Cannot delete files outside the current working directory.');
      return false;
    }
  }

  try {
    // Actually delete. Or not.
    if (!nowrite) {
      rimraf.sync(filepath);
    }
    return true;
  } catch(e) {
    throw new Error('Unable to delete "' + filepath + '" file (' + e.message + ').', e);
  }
};

// Extend dependencies
File.prototype.glob = require('glob');
File.prototype.minimatch = require('minimatch');
File.prototype.findup = require('findup-sync');
_.extend(File.prototype, fquery);
