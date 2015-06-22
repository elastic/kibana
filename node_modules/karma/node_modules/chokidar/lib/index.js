'use strict';
var EventEmitter = require('events').EventEmitter;
var sysPath = require('path');
var each = require('async-each');

var NodeFsHandler = require('./nodefs-handler');
var FsEventsHandler = require('./fsevents-handler');
exports.isBinaryPath = require('./is-binary');

var platform = require('os').platform();

// Public: Main class.
// Watches files & directories for changes.
//
// * _opts - object, chokidar options hash
//
// Emitted events:
// `add`, `addDir`, `change`, `unlink`, `unlinkDir`, `all`, `error`
//
// Examples
//
//  var watcher = new FSWatcher()
//    .add(directories)
//    .on('add', function(path) {console.log('File', path, 'was added');})
//    .on('change', function(path) {console.log('File', path, 'was changed');})
//    .on('unlink', function(path) {console.log('File', path, 'was removed');})
//    .on('all', function(event, path) {console.log(path, ' emitted ', event);})
//
function FSWatcher(_opts) {
  var opts = {};
  // in case _opts that is passed in is a frozen object
  if (_opts) for (var opt in _opts) opts[opt] = _opts[opt];
  this._watched = Object.create(null);
  this._watchers = [];
  this._ignoredPaths = Object.create(null);
  this.closed = false;
  this._throttled = Object.create(null);
  this._symlinkPaths = Object.create(null);

  function undef(key) {
    return opts[key] === undefined;
  }

  // Set up default options.
  if (undef('persistent')) opts.persistent = true;
  if (undef('ignoreInitial')) opts.ignoreInitial = false;
  if (undef('ignorePermissionErrors')) opts.ignorePermissionErrors = false;
  if (undef('interval')) opts.interval = 100;
  if (undef('binaryInterval')) opts.binaryInterval = 300;
  this.enableBinaryInterval = opts.binaryInterval !== opts.interval;

  // Enable fsevents on OS X when polling isn't explicitly enabled.
  if (undef('useFsEvents')) opts.useFsEvents = !opts.usePolling;

  // If we can't use fsevents, ensure the options reflect it's disabled.
  if (!FsEventsHandler.canUse()) opts.useFsEvents = false;

  // Use polling on Mac if not using fsevents.
  // Other platforms use non-polling fs.watch.
  if (undef('usePolling') && !opts.useFsEvents) {
    opts.usePolling = platform === 'darwin';
  }

  // Editor atomic write normalization enabled by default with fs.watch
  if (undef('atomic')) opts.atomic = !opts.usePolling && !opts.useFsEvents;
  if (opts.atomic) this._pendingUnlinks = Object.create(null);

  if (undef('followSymlinks')) opts.followSymlinks = true;

  this._isntIgnored = function(entry) {
    return !this._isIgnored(entry.path, entry.stat);
  }.bind(this);

  var readyCalls = 0;
  this._emitReady = function() {
    if (++readyCalls >= this._readyCount) {
      this._emitReady = Function.prototype;
      // use process.nextTick to allow time for listener to be bound
      process.nextTick(this.emit.bind(this, 'ready'));
    }
  }.bind(this);

  this.options = opts;

  // You’re frozen when your heart’s not open.
  Object.freeze(opts);
}

FSWatcher.prototype = Object.create(EventEmitter.prototype);

// Common helpers
// --------------
FSWatcher.prototype._emit = function(event, target, val1, val2, val3) {
  var args = [event, target, val1, val2, val3];
  if (this.options.atomic) {
    if (event === 'unlink') {
      this._pendingUnlinks[target] = args;
      setTimeout(function() {
        Object.keys(this._pendingUnlinks).forEach(function(path) {
          this.emit.apply(this, this._pendingUnlinks[path]);
          this.emit.apply(this, ['all'].concat(this._pendingUnlinks[path]));
          delete this._pendingUnlinks[path];
        }.bind(this));
      }.bind(this), 100);
      return this;
    } else if (event === 'add' && this._pendingUnlinks[target]) {
      event = args[0] = 'change';
      delete this._pendingUnlinks[target];
    }
    if (event === 'change') {
      if (!this._throttle('change', target, 50)) return this;
    }
  }
  this.emit.apply(this, args);
  if (event !== 'error') this.emit.apply(this, ['all'].concat(args));
  return this;
};

FSWatcher.prototype._handleError = function(error) {
  if (error &&
    error.code !== 'ENOENT' &&
    error.code !== 'ENOTDIR' &&
    !(error.code === 'EPERM' && !this.options.ignorePermissionErrors)
  ) this.emit('error', error);
  return error || this.closed;
};

FSWatcher.prototype._throttle = function(action, path, timeout) {
  if (!(action in this._throttled)) {
    this._throttled[action] = Object.create(null);
  }
  var throttled = this._throttled[action];
  if (path in throttled) return false;
  function clear() {
    delete throttled[path];
    clearTimeout(timeoutObject);
  }
  var timeoutObject = setTimeout(clear, timeout);
  throttled[path] = {timeoutObject: timeoutObject, clear: clear};
  return throttled[path];
};

FSWatcher.prototype._isIgnored = function(path, stats) {
  if (
    this.options.atomic &&
    /^\..*\.(sw[px])$|\~$|\.subl.*\.tmp/.test(path)
  ) return true;
  var userIgnored = (function(ignored) {
    switch (toString.call(ignored)) {
    case '[object RegExp]':
      return function(string) {
        return ignored.test(string);
      };
    case '[object Function]':
      return ignored;
    default:
      return function() {
        return false;
      };
    }
  })(this.options.ignored);
  var ignoredPaths = Object.keys(this._ignoredPaths);
  function isParent(ip) {
    return !path.indexOf(ip + sysPath.sep);
  }
  return ignoredPaths.length && ignoredPaths.some(isParent) ||
    userIgnored(path, stats);
};

// Directory helpers
// -----------------
FSWatcher.prototype._getWatchedDir = function(directory) {
  var dir = sysPath.resolve(directory);
  if (!(dir in this._watched)) this._watched[dir] = {
    _items: Object.create(null),
    add: function(item) {this._items[item] = true;},
    remove: function(item) {delete this._items[item];},
    has: function(item) {return item in this._items;},
    children: function() {return Object.keys(this._items);}
  };
  return this._watched[dir];
};

// File helpers
// ------------

// Private: Check for read permissions
// Based on this answer on SO: http://stackoverflow.com/a/11781404/1358405
//
// * stats - object, result of fs.stat
//
// Returns Boolean
FSWatcher.prototype._hasReadPermissions = function(stats) {
  return Boolean(4 & parseInt((stats.mode & 0x1ff).toString(8)[0], 10));
};

// Private: Handles emitting unlink events for
// files and directories, and via recursion, for
// files and directories within directories that are unlinked
//
// * directory - string, directory within which the following item is located
// * item      - string, base path of item/directory
//
// Returns nothing.
FSWatcher.prototype._remove = function(directory, item) {
  // if what is being deleted is a directory, get that directory's paths
  // for recursive deleting and cleaning of watched object
  // if it is not a directory, nestedDirectoryChildren will be empty array
  var fullPath = sysPath.join(directory, item);
  var absolutePath = sysPath.resolve(fullPath);
  var isDirectory = this._watched[fullPath] || this._watched[absolutePath];

  // prevent duplicate handling in case of arriving here nearly simultaneously
  // via multiple paths (such as _handleFile and _handleDir)
  if (!this._throttle('remove', fullPath, 100)) return;

  // if the only watched file is removed, watch for its return
  var watchedDirs = Object.keys(this._watched);
  if (!isDirectory && !this.options.useFsEvents && watchedDirs.length === 1) {
    this.add(directory, item);
  }

  // This will create a new entry in the watched object in either case
  // so we got to do the directory check beforehand
  var nestedDirectoryChildren = this._getWatchedDir(fullPath).children();

  // Recursively remove children directories / files.
  nestedDirectoryChildren.forEach(function(nestedItem) {
    this._remove(fullPath, nestedItem);
  }, this);

  // Remove directory / file from watched list.
  this._getWatchedDir(directory).remove(item);

  // The Entry will either be a directory that just got removed
  // or a bogus entry to a file, in either case we have to remove it
  delete this._watched[fullPath];
  delete this._watched[absolutePath];
  var eventName = isDirectory ? 'unlinkDir' : 'unlink';
  this._emit(eventName, fullPath);
};

// Public: Adds directories / files for tracking.

// * files    - array of strings (file or directory paths).
// * _origAdd - private argument for handling non-existent paths to be watched

// Returns an instance of FSWatcher for chaining.
FSWatcher.prototype.add = function(files, _origAdd) {
  this.closed = false;
  if (!('_initialAdd' in this)) this._initialAdd = true;
  if (!Array.isArray(files)) files = [files];

  if (this.options.useFsEvents && FsEventsHandler.canUse()) {
    if (!this._readyCount) this._readyCount = files.length;
    if (this.options.persistent) this._readyCount *= 2;
    files.forEach(this._addToFsEvents, this);
  } else {
    if (!this._readyCount) this._readyCount = 0;
    this._readyCount += files.length;
    each(files, function(file, next) {
      this._addToNodeFs(file, this._initialAdd, _origAdd, function(err, res) {
        if (res) this._emitReady();
        next(err, res);
      }.bind(this));
    }.bind(this), function(error, results) {
      results.forEach(function(item){
        if (!item) return;
        this.add(sysPath.dirname(item), sysPath.basename(_origAdd || item));
      }, this);
    }.bind(this));
  }

  this._initialAdd = false;
  return this;
};

// Public: Remove all listeners from watched files.

// Returns an instance of FSWatcher for chaining.
FSWatcher.prototype.close = function() {
  if (this.closed) return this;

  this.closed = true;
  this._watchers.forEach(function(watcher) {
    watcher.close();
  });
  this._watched = Object.create(null);

  this.removeAllListeners();
  return this;
};

// Attach watch handler prototype methods
function importProto (proto) {
  Object.keys(proto).forEach(function(method) {
    FSWatcher.prototype[method] = proto[method];
  });
}
importProto(NodeFsHandler.prototype);
if (FsEventsHandler.canUse()) importProto(FsEventsHandler.prototype);

exports.FSWatcher = FSWatcher;

exports.watch = function(files, options) {
  return new FSWatcher(options).add(files);
};
