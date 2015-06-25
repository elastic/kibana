var _ = require('lodash');
var Promise = require('bluebird');
var readdir = Promise.promisify(require('fs').readdir);
var stat = Promise.promisify(require('fs').stat);
var join = require('path').join;

module.exports = function (server, includeDirs) {
  return Promise.map(includeDirs, function (dir) {
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
  .then(_.flatten)
  .then(_.compact)
  .filter(function (dir) {
    try {
      require(dir);
      server.log('plugin-scan', 'Found plugin at ' + dir);
      return true;
    } catch (e) {
      server.log('plugin-scan', 'Skipping non-plugin directory at ' + dir);
      return false;
    }
  });
};
