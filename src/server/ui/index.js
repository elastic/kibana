module.exports = function (kibana, server, config) {
  var _ = require('lodash');
  var join = require('path').join;
  var Boom = require('boom');
  var exists = require('fs').existsSync;
  var stat = require('fs').statSync;
  var relative = require('path').relative;

  var UiExports = require('./UiExports');
  var defaultModuleIds = require('./defaultModuleIds');
  var findBowerComponents = require('./findBowerComponents');

  var uiDir = require('./uiDir');

  // setup jade for templates
  server.views({
    path: join(__dirname, 'views'),
    engines: {
      jade: require('jade')
    }
  });

  // export manager
  kibana.uiExports = new UiExports(defaultModuleIds());

  server.decorate('server', 'getApps', function () {
    return kibana.uiExports.apps || {};
  });

  server.decorate('server', 'getApp', function (id) {
    return this.getApps()[id];
  });

  // initialize the browser runtime for the app
  server.route({
    path: '/app/{id}/',
    method: 'GET',
    handler: function (req, reply) {
      var id = req.params.id;
      var app = server.getApp(id);
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      return reply.view('bootstrap', {
        app: app,
        version: kibana.version,
        buildSha: _.get(kibana, 'build.sha', '@@buildSha'),
        buildNumber: _.get(kibana, 'build.number', '@@buildNum'),
        kbnIndex: config.get('kibana.index'),
        esShardTimeout: config.get('elasticsearch.shardTimeout')
      });
    }
  });

  // redirect missing slashes
  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      reply.redirect('/app/' + req.params.id + '/').permanent(true);
    }
  });

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
