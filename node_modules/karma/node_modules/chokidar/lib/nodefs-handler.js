'use strict';

var fs = require('fs');
var sysPath = require('path');
var readdirp = require('readdirp');

var isBinaryPath = require('./is-binary');

var isWindows = require('os').platform() === 'win32';

// fs.watch helpers
var FsWatchInstances = Object.create(null);
function createFsWatchInstance(item, options, callback, errHandler, emitRaw) {
  var handleEvent = function(rawEvent, path) {
    callback(item);
    emitRaw(rawEvent, path, {watchedPath: item});
    if (path && item !== path) {
      fsWatchBroadcast(
        sysPath.resolve(item, path), 'listeners', sysPath.join(item, path)
      );
    }
  };
  try {
    return fs.watch(item, options, handleEvent);
  } catch (error) {
    errHandler(error);
  }
}

function fsWatchBroadcast(absPath, type, value1, value2, value3) {
  if (!FsWatchInstances[absPath]) return;
  FsWatchInstances[absPath][type].forEach(function(callback) {
    callback(value1, value2, value3);
  });
}

function setFsWatchListener(item, absPath, options, handlers) {
  var callback = handlers.callback;
  var errHandler = handlers.errHandler;
  var rawEmitter = handlers.rawEmitter;
  var container = FsWatchInstances[absPath];
  if (!options.persistent) {
    return createFsWatchInstance(
      item, options, callback, errHandler, rawEmitter
    );
  } else if (!container) {
    var watcher = createFsWatchInstance(
      item,
      options,
      fsWatchBroadcast.bind(null, absPath, 'listeners'),
      errHandler, // no need to use broadcast here
      fsWatchBroadcast.bind(null, absPath, 'rawEmitters')
    );
    if (!watcher) return;
    var broadcastErr = fsWatchBroadcast.bind(null, absPath, 'errHandlers');
    watcher.on('error', function(error) {
      // Workaround for https://github.com/joyent/node/issues/4337
      if (isWindows && error.code === 'EPERM') {
        fs.open(item, 'r', function(err, fd) {
          if (fd) fs.close(fd);
          if (!err) broadcastErr(error);
        });
      } else {
        broadcastErr(error);
      }
    });
    container = FsWatchInstances[absPath] = {
      listeners: [callback],
      errHandlers: [errHandler],
      rawEmitters: [rawEmitter],
      watcher: watcher
    };
  } else {
    container.listeners.push(callback);
    container.errHandlers.push(errHandler);
    container.rawEmitters.push(rawEmitter);
  }
  var listenerIndex = container.listeners.length - 1;
  return {
    close: function() {
      delete container.listeners[listenerIndex];
      delete container.errHandlers[listenerIndex];
      if (!Object.keys(container.listeners).length) {
        container.watcher.close();
        delete FsWatchInstances[absPath];
      }
    }
  };
}

// fs.watchFile helpers
var FsWatchFileInstances = Object.create(null);
function setFsWatchFileListener(item, absPath, options, handlers) {
  var callback = handlers.callback;
  var rawEmitter = handlers.rawEmitter;
  var container = FsWatchFileInstances[absPath];
  var listeners = [];
  var rawEmitters = [];
  if (
    container && (
      container.options.persistent < options.persistent ||
      container.options.interval > options.interval
    )
  ) {
    // "Upgrade" the watcher to persistence or a quicker interval.
    // This creates some unlikely edge case issues if the user mixes
    // settings in a very weird way, but solving for those cases
    // doesn't seem worthwhile for the added complexity.
    listeners = container.listeners;
    rawEmitters = container.rawEmitters;
    fs.unwatchFile(absPath);
    container = false;
  }
  if (!container) {
    listeners.push(callback);
    rawEmitters.push(rawEmitter);
    container = FsWatchFileInstances[absPath] = {
      listeners: listeners,
      rawEmitters: rawEmitters,
      options: options,
      watcher: fs.watchFile(absPath, options, function(curr, prev) {
        container.rawEmitters.forEach(function(rawEmitter) {
          rawEmitter('change', absPath, {curr: curr, prev: prev});
        });
        var currmtime = curr.mtime.getTime();
        if (currmtime > prev.mtime.getTime() || currmtime === 0) {
          container.listeners.forEach(function(callback) {
            callback(item, curr);
          });
        }
      })
    };
  } else {
    container.listeners.push(callback);
  }
  var listenerIndex = container.listeners.length - 1;
  return {
    close: function() {
      delete container.listeners[listenerIndex];
      if (!Object.keys(container.listeners).length) {
        fs.unwatchFile(absPath);
        delete FsWatchFileInstances[absPath];
      }
    }
  };
}

// constructor
function NodeFsHandler() {}

// Private: Watch file for changes with fs.watchFile or fs.watch.

// * item     - string, path to file or directory.
// * callback - function that will be executed on fs change.

// Returns nothing.
NodeFsHandler.prototype._watchWithNodeFs =
function(item, callback) {
  var directory = sysPath.dirname(item);
  var basename = sysPath.basename(item);
  var parent = this._getWatchedDir(directory);
  if (parent.has(basename)) return;
  parent.add(basename);
  var absolutePath = sysPath.resolve(item);
  var options = {persistent: this.options.persistent};
  if (!callback) callback = Function.prototype; // empty function

  var watcher;
  if (this.options.usePolling) {
    options.interval = this.enableBinaryInterval && isBinaryPath(basename) ?
      this.options.binaryInterval : this.options.interval;
    watcher = setFsWatchFileListener(item, absolutePath, options, {
      callback: callback,
      rawEmitter: this.emit.bind(this, 'raw')
    });
  } else {
    watcher = setFsWatchListener(item, absolutePath, options, {
      callback: callback,
      errHandler: this._handleError.bind(this),
      rawEmitter: this.emit.bind(this, 'raw')
    });
  }
  if (watcher) this._watchers.push(watcher);
};

// Private: Emit `change` event once and watch file to emit it in the future
// once the file is changed.

// * file       - string, fs path.
// * stats      - object, result of fs.stat
// * initialAdd - boolean, was the file added at watch instantiation?

// Returns nothing.
NodeFsHandler.prototype._handleFile =
function(file, stats, initialAdd, target, callback) {
  var dirname = sysPath.dirname(file);
  var basename = sysPath.basename(file);
  var parent = this._getWatchedDir(dirname);
  // if the file is already being watched, do nothing
  if (parent.has(basename)) return;
  this._watchWithNodeFs(file, function(path, newStats) {
    if (!this._throttle('watch', file, 5)) return;
    if (!newStats || newStats && newStats.mtime.getTime() === 0) {
      fs.stat(file, function(error, newStats) {
        // Fix issues where mtime is null but file is still present
        if (error) {
          this._remove(dirname, basename);
        } else {
          this._emit('change', file, newStats);
        }
      }.bind(this));
    // add is about to be emitted if file not already tracked in parent
    } else if (parent.has(basename)) {
      this._emit('change', file, newStats);
    }
  }.bind(this));
  if (!(initialAdd && this.options.ignoreInitial)) {
    if (!this._throttle('add', file, 0)) return;
    this._emit('add', file, stats);
  }
  if (callback) callback();
};

// Private: Read directory to add / remove files from `@watched` list
// and re-read it on change.

// * dir        - string, fs path.
// * stats      - object, result of fs.stat
// * initialAdd - boolean, was the file added at watch instantiation?
// * target     - child path actually targeted for watch

// Returns nothing.
NodeFsHandler.prototype._handleDir =
function(dir, stats, initialAdd, target, callback) {
  var _this = this;
  function read(directory, initialAdd, done) {
    // Normalize the directory name on Windows
    directory = sysPath.join(directory, '');
    var throttler = _this._throttle('readdir', directory, 1000);
    if (!throttler) return;
    var previous = _this._getWatchedDir(directory);
    var current = [];

    readdirp({
      root: directory,
      entryType: 'all',
      depth: 0,
      lstat: true
    }).on('data', function(entry) {
      var item = entry.path;
      current.push(item);
      var path = sysPath.join(directory, item);

      if (entry.stat.isSymbolicLink()) {
        if (!_this.options.followSymlinks) {
          _this._readyCount++;
          fs.realpath(path, function(error, linkPath) {
            if (previous.has(item)) {
              if (_this._symlinkPaths[entry.fullPath] !== linkPath) {
                _this._symlinkPaths[entry.fullPath] = linkPath;
                _this._emit('change', path, entry.stat);
              }
            } else {
              previous.add(item);
              _this._symlinkPaths[entry.fullPath] = linkPath;
              _this._emit('add', path, entry.stat);
            }
            _this._emitReady();
          });
          return;
        }
        if (_this._symlinkPaths[entry.fullPath]) return;
        else _this._symlinkPaths[entry.fullPath] = true;
      }

      // Files that present in current directory snapshot
      // but absent in previous are added to watch list and
      // emit `add` event.
      if (item === target || !target && !previous.has(item)) {
        _this._readyCount++;
        if (_this.options.atomic && /\~$/.test(item)) {
          _this._emit('change', item.slice(0, -1), entry.stat);
        }
        _this._addToNodeFs(sysPath.join(directory, item), initialAdd);
      }
    }).on('end', function() {
      throttler.clear();
      if (done) done();

      // Files that absent in current directory snapshot
      // but present in previous emit `remove` event
      // and are removed from @watched[directory].
      previous.children().filter(function(item) {
        return item !== directory && current.indexOf(item) === -1;
      }).forEach(function(item) {
        _this._remove(directory, item);
      });
    }).on('error', _this._handleError.bind(_this));
  }
  if (!target) read(dir, initialAdd, callback);
  this._watchWithNodeFs(dir, function(dirPath, stats) {
    // Current directory is removed, do nothing
    if (stats && stats.mtime.getTime() === 0) return;
    read(dirPath, false);
  });
  if (!(initialAdd && this.options.ignoreInitial) && !target) {
    this._emit('addDir', dir, stats);
  }
};

// Private: Handle added file or directory.
// Delegates call to _handleFile / _handleDir after checks.

// * item       - string, path to file or directory.
// * initialAdd - boolean, was the file added at watch instantiation?
// * target     - child path actually targeted for watch
// * callback   - indicates whether the item was found or not

// Returns nothing.
NodeFsHandler.prototype._addToNodeFs =
function(item, initialAdd, target, callback) {
  if (!callback) callback = Function.prototype;
  if (this._isIgnored(item) || this.closed) {
    this._emitReady();
    return callback(null, false);
  }

  var followSymlinks = this.options.followSymlinks;
  fs[followSymlinks ? 'stat' : 'lstat'](item, function(error, stats) {
    if (this._handleError(error)) return callback(null, item);
    if ((
      this.options.ignorePermissionErrors &&
      !this._hasReadPermissions(stats)
    ) || (
      this._isIgnored.length === 2 &&
      this._isIgnored(item, stats)
    )) {
      this._emitReady();
      return callback(null, false);
    }
    if (stats.isDirectory()) {
      this._handleDir(item, stats, initialAdd, target, this._emitReady);
    } else if (stats.isSymbolicLink()) {
      var parent = sysPath.dirname(item);
      this._getWatchedDir(parent).add(item);
      this._emit('add', item, stats);
      this._handleDir(parent, stats, initialAdd, item, this._emitReady);
      fs.realpath(item, function(error, linkPath) {
        this._symlinkPaths[sysPath.resolve(item)] = linkPath;
        this._emitReady();
      }.bind(this));
    } else {
      this._handleFile(item, stats, initialAdd, target, this._emitReady);
    }
    callback(null, false);
  }.bind(this));
};

module.exports = NodeFsHandler;
