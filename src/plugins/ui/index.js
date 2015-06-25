module.exports = function (kibana) {
  var _ = require('lodash');
  var join = require('path').join;
  var Boom = require('boom');
  var exists = require('fs').existsSync;
  var stat = require('fs').statSync;
  var relative = require('path').relative;
  var publicDir = join(__dirname, 'public');

  return new kibana.Plugin({
    publicDir: false, // we will serve our own public fir
    init: function (server) {
      var config = server.config();

      // setup jade for templates
      server.views({
        path: join(__dirname, 'views'),
        engines: {
          jade: require('jade')
        }
      });

      // redirect to the default app
      server.route({
        path: '/',
        method: 'GET',
        handler: function (req, reply) {
          return reply.redirect('/app/' + config.get('kibana.defaultAppId') + '/');
        }
      });

      // initialize the browser runtime for the app
      server.route({
        path: '/app/{id}/',
        method: 'GET',
        handler: function (req, reply) {
          var id = req.params.id;
          var apps = server.getApps();

          var app = apps[id];
          if (!app) return reply(Boom.notFound('Unkown app ' + id));

          return reply.view('chrome', {
            app: app,
            version: kibana.package.version,
            buildSha: _.get(kibana, 'package.build.sha', '@@buildSha'),
            buildNumber: _.get(kibana, 'package.build.number', '@@buildNum'),
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout')
          });
        }
      });

      // initialize the browser runtime for the app
      server.route({
        path: '/app/{id}/{filePath*}',
        method: 'GET',
        handler: function (req, reply) {
          var id = req.params.id;
          var apps = server.getApps();

          var app = apps[id];
          if (!app) return reply(Boom.notFound('Unkown app ' + id));

          return reply.file(join(app.publicDir, req.params.filePath));
        }
      });


      server.route({
        path: '/bower_components/{path*}',
        method: 'GET',
        handler: {
          directory: {
            path: (function findBowerComponents() {
              // find bower_components by searching up until reaching the kibana dir
              var dir = __dirname;

              while (!exists(join(dir, 'bower_components'))) {
                var prev = dir;
                dir = join(dir, '..');

                if (dir === prev || relative(kibana.rootDir, dir) === '..') {
                  throw new Error('unable to find bower_components');
                }
              }

              return join(dir, 'bower_components');
            }()),
            listing: true
          }
        }
      });


      require('fs')
      .readdirSync(publicDir)
      .forEach(function (name) {
        var path = join(publicDir, name);

        if (stat(path).isDirectory()) {
          server.route({
            path: '/' + name + '/{path*}',
            method: 'GET',
            handler: {
              directory: {
                path: path
              }
            }
          });
        } else {
          server.route({
            path: '/' + name,
            method: 'GET',
            handler: {
              file: path
            }
          });
        }
      });
    }
  });
};
