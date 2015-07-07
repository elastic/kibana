module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var Promise = require('bluebird');
  var readdir = Promise.promisify(require('fs').readdir);
  var stat = Promise.promisify(require('fs').stat);
  var join = require('path').join;

  var scanDirs = [].concat(config.get('plugins.scanDirs'));
  var absolutePaths = [].concat(config.get('plugins.paths'));

  return Promise.map(scanDirs, function (dir) {
    server.log('plugin-scan', 'Scanning ' + dir + ' for plugins');

    return readdir(dir).map(function (file) {
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
      server.log('plugin-scan', 'Found plugin at ' + dir);
      return true;
    } catch (e) {
      server.log('plugin-scan', 'Skipping non-plugin directory at ' + dir);
      return false;
    }
  })
  .then(function (pluginPaths) {
    kbnServer.pluginPaths = pluginPaths;
  });
};
