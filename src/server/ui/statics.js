module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var assets = require('./assets');

  _.forOwn(assets.files, function (path, name) {
    server.exposeStaticFile('/' + name, path);
  });

  _.forOwn(assets.dirs, function (dir, name) {
    server.exposeStaticDir('/' + name + '/{path*}', dir);
  });

};
