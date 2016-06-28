/**
 * [exports description]
 * @type {[type]}
 */
module.exports = RcFinder;

var path = require('path');
var cloneDeep = require('lodash').cloneDeep;
var fs = require('fs');

function RcFinder(rcName, opts) {
  if (!(this instanceof RcFinder))
    return new RcFinder(rcName, opts);

  opts = opts || {};
  var pathMap = {};
  var configMap = {};

  var loader = opts.loader || function (path) {
    return JSON.parse(fs.readFileSync(path));
  };

  if (loader === 'async') {
    loader = function (path, cb) {
      fs.readFile(path, function (err, file) {
        var config;
        if (!err) {
          try {
            config = JSON.parse(file);
          } catch(e) {
            err = new Error(path + ' is not valid JSON: ' + e.message);
          }
        }
        cb(err, config);
      });
    };
  }

  this.canLoadSync = loader.length === 1;

  var defaults = {};
  if (typeof opts.defaultFile === 'string') {
    defaults = opts.defaultFile;
  }

  // configurable to make testing simpler
  var syncCheck = opts._syncCheck || function (path) {
    return fs.existsSync(path);
  };
  var asyncCheck = opts._asyncCheck || function (path, cb) {
    fs.stat(path, function (err, exists) {
      if (err && err.code !== 'ENOENT') return cb(err);
      cb(void 0, !err);
    });
  };

  // expose the file loading logic (using an explicit path) to make life easier
  var get = this.get = function get(path, cb) {
    if (loader.length > 1 && typeof cb === 'function') {
      return loader(path, cb);
    }

    if (loader.length === 1) {
      // sync loader, return can still be done async

      var config, err;
      try {
        config = loader(path) || false;
      }
      catch (e) {
        configMap[path] = false;
        err = e;
      }
      finally {
        if (typeof cb === 'function') {
          process.nextTick(function () {
            cb(err, config);
          });
        } else {
          if (err) throw err;
          else return config;
        }

      }
    }
  };

  this.find = function (from, cb) {
    from = from || process.cwd();

    var rcPath;
    var rcConfig;
    var checkPath;
    var searched = [];
    var dir = from;
    var sync = (typeof cb !== 'function');

    if (sync && loader.length > 1) {
      throw new TypeError('You need to call find with a callback because the loader is async');
    }

    function respond(err, rcPath) {
      if (!err) {
        if (!rcPath) {
          // it should be safe to test for undef
          rcConfig = rcPath = false;
        } else {
          // we need to populate the cache
          if (configMap[rcPath] === void 0) {
            if (sync) {
              try {
                configMap[rcPath] = get(rcPath);
              } catch (e) {
                configMap[rcPath] = false;
                err = e;
              } finally {
                return respond(err, rcPath);
              }
              // and keep going
            } else {
              // stop and load
              return get(rcPath, function (err, config) {
                configMap[rcPath] = config;
                respond(err, rcPath);
              });
            }
          }

          // clone the cached copy so that people can't fuck with them
          rcConfig = cloneDeep(configMap[rcPath]);
        }

        searched.forEach(function (dir) {
          pathMap[dir] = rcPath;
        });
      }

      if (sync && err) throw err;
      if (sync) return rcConfig;
      cb(err || void 0, rcConfig);
    }

    if (sync) {
      for (; !~searched.indexOf(dir); dir = path.resolve(dir, '..')) {
        if (pathMap[dir] !== void 0) {
          rcPath = pathMap[dir];
          break;
        }

        searched.push(dir);
        checkPath = path.join(dir, rcName);
        if (syncCheck(checkPath)) {
          rcPath = checkPath;
          break;
        }
      }

      return respond(void 0, rcPath);
    }

    // async find
    process.nextTick(function next() {
      if (~searched.indexOf(dir))
        return respond();

      if (pathMap[dir] !== void 0)
        return respond(void 0, pathMap[dir]);

      searched.push(dir);
      checkPath = path.join(dir, rcName);
      asyncCheck(checkPath, function (err, exists) {
        if (err) return respond(err);
        if (exists) return respond(void 0, checkPath);
        // else keep looking
        dir = path.resolve(dir, '..');
        process.nextTick(next);
      });
    });
  };
}