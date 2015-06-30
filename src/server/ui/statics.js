module.exports = function (kbnServer, server, config) {
  var Boom = require('boom');
  var assetsDir = require('./assetsDir');
  var join = require('path').join;
  var stat = require('fs').statSync;

  // expose our public files at the server root explicitly, rather than with a catch all route
  require('fs')
  .readdirSync(assetsDir)
  .forEach(function (name) {
    var path = join(assetsDir, name);

    if (stat(path).isDirectory()) {
      server.exposeStaticDir('/' + name + '/{path*}', path);
    }
    else {
      server.exposeStaticFile('/' + name, path);
    }
  });
};
