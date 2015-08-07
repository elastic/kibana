module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let Boom = require('boom');
  let formatUrl = require('url').format;
  let { join, resolve } = require('path');

  let UiExports = require('./UiExports');
  let UiBundleCollection = require('./UiBundleCollection');
  let UiBundlerEnv = require('./UiBundlerEnv');

  let uiExports = kbnServer.uiExports = new UiExports(kbnServer);

  let bundlerEnv = new UiBundlerEnv(config.get('optimize.bundleDir'));
  bundlerEnv.addContext('env', config.get('env.name'));
  bundlerEnv.addContext('sourceMaps', config.get('optimize.sourceMaps'));
  bundlerEnv.addContext('kbnVersion', config.get('pkg.version'));
  bundlerEnv.addContext('buildNum', config.get('pkg.buildNum'));
  uiExports.addConsumer(bundlerEnv);

  for (let plugin of kbnServer.plugins) {
    uiExports.consumePlugin(plugin);
  }

  let bundles = kbnServer.bundles = new UiBundleCollection(bundlerEnv);

  for (let app of uiExports.getAllApps()) {
    bundles.addApp(app);
  }

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));

  // serve the app switcher
  server.route({
    path: '/apps',
    method: 'GET',
    handler: function (req, reply) {
      let switcher = uiExports.getHiddenApp('switcher');
      if (!switcher) return reply(Boom.notFound('app switcher not installed'));
      return reply.renderApp(switcher);
    }
  });

  // serve the app switcher
  server.route({
    path: '/api/apps',
    method: 'GET',
    handler: function (req, reply) {
      return reply(uiExports.apps);
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      let id = req.params.id;
      let app = uiExports.apps.byId[id];
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      if (kbnServer.status.isGreen()) {
        return reply.renderApp(app);
      } else {
        return reply.renderStatusPage();
      }
    }
  });

  server.decorate('reply', 'renderApp', function (app) {
    let payload = {
      app: app,
      appCount: uiExports.apps.length,
      version: kbnServer.version,
      buildSha: _.get(kbnServer, 'build.sha', '@@buildSha'),
      buildNumber: _.get(kbnServer, 'build.number', '@@buildNum'),
      cacheBust: _.get(kbnServer, 'build.number', ''),
      kbnIndex: config.get('kibana.index'),
      esShardTimeout: config.get('elasticsearch.shardTimeout')
    };

    return this.view(app.templateName, {
      app: app,
      cacheBust: payload.cacheBust,
      kibanaPayload: payload
    });
  });
};
