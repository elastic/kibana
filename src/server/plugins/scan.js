module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Promise = require('bluebird');
  var readdir = Promise.promisify(require('fs').readdir);
  var stat = Promise.promisify(require('fs').stat);
  var join = require('path').join;

  var scanDirs = [].concat(config.get('plugins.scanDirs') || []);
  var absolutePaths = [].concat(config.get('plugins.paths') || []);
  var debug = _.bindKey(server, 'log', ['plugins', 'debug']);

  return Promise.map(scanDirs, function (dir) {
    debug({ tmpl: 'Scanning `<%= dir %>` for plugins', dir: dir });

    return readdir(dir)
    .catch(function (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }

      server.log('warning', {
        tmpl: '<%= err.code %>: Unable to scan non-existent directory for plugins "<%= dir %>"',
        err: err,
        dir: dir
      });

      return [];
    })
    .map(function (file) {
      if (file === '.' || file === '..') return false;
      var path = join(dir, file);

      return stat(path)
      .then(function (stat) {
        return stat.isDirectory() ? path : false;
      });
    });
  })
  .then(function (dirs) {
    return _(dirs)
    .flatten()
    .compact()
    .union(absolutePaths)
    .value();
  })
  .filter(function (dir) {
    try {
      require(dir);
      debug({ tmpl: 'Found plugin at <%= dir %>', dir: dir });
      return true;
    } catch (e) {
      debug({ tmpl: 'Skipping non-plugin directory at <%= dir %>', dir: dir });
      return false;
    }
  })
  .then(function (pluginPaths) {
    kbnServer.pluginPaths = pluginPaths;
  });
};
