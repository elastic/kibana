module.exports = function (kibana, server, config) {
  var Boom = require('boom');
  var findBowerComponents = require('./lib/findBowerComponents');
  var uiDir = require('./lib/uiDir');
  var join = require('path').join;
  var stat = require('fs').statSync;

  // provide access to an app's public directories
  server.exposeStaticDir('/app/{id}/{path*}', function pickDir(req) {
    var id = req.params.id;
    var app = server.getApps()[id];

    if (!app) return Boom.notFound('Unkown app ' + id);
    return app.publicDir || Boom.notFound(id + ' does not server public files');
  });

  // expose the first bower_components directory found within kibana's rootDir starting
  // in this directory and moving out
  server.exposeStaticDir('/bower_components/{path*}', findBowerComponents(__dirname, kibana.rootDir));

  // expose our public files at the server root explicitly, rather than with a catch all route
  require('fs')
  .readdirSync(uiDir)
  .forEach(function (name) {
    var path = join(uiDir, name);

    if (stat(path).isDirectory()) {
      server.exposeStaticDir('/' + name + '/{path*}', path);
    }
    else {
      server.exposeStaticFile('/' + name, path);
    }
  });
};
