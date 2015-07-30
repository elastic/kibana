'use strict';

module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let Promise = require('bluebird');
  let readdir = Promise.promisify(require('fs').readdir);
  let stat = Promise.promisify(require('fs').stat);
  let resolve = require('path').resolve;

  let scanDirs = [].concat(config.get('plugins.scanDirs') || []);
  let absolutePaths = [].concat(config.get('plugins.paths') || []);
  let debug = _.bindKey(server, 'log', ['plugins', 'debug']);
  let warning = _.bindKey(server, 'log', ['plugins', 'warning']);

  return Promise.map(scanDirs, function (dir) {
    debug({ tmpl: 'Scanning `<%= dir %>` for plugins', dir: dir });

    return readdir(dir)
    .catch(function (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }

      warning({
        tmpl: '<%= err.code %>: Unable to scan non-existent directory for plugins "<%= dir %>"',
        err: err,
        dir: dir
      });

      return [];
    })
    .map(function (file) {
      if (file === '.' || file === '..') return false;
      let path = resolve(dir, file);

      return stat(path).then(function (stat) {
        return stat.isDirectory() ? path : false;
      });
    });
  })
  .then(function (dirs) {
    return _([dirs, absolutePaths])
    .flattenDeep()
    .compact()
    .uniq()
    .value();
  })
  .filter(function (dir) {
    let path;
    try { path = require.resolve(dir); } catch (e) {}

    if (!path) {
      warning({ tmpl: 'Skipping non-plugin directory at <%= dir %>', dir: dir });
      return false;
    } else {
      require(path);
      debug({ tmpl: 'Found plugin at <%= dir %>', dir: dir });
      return true;
    }
  })
  .then(function (pluginPaths) {
    kbnServer.pluginPaths = pluginPaths;
  });
};
