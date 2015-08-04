module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let Boom = require('boom');
  let formatUrl = require('url').format;
  let { join, resolve } = require('path');
  let UiExports = require('./UiExports');

  let uiExports = kbnServer.uiExports = new UiExports(kbnServer);
  let apps = uiExports.apps;
  let hiddenApps = uiExports.apps.hidden;

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));

  // serve the app switcher
  server.route({
    path: '/apps',
    method: 'GET',
    handler: function (req, reply) {
      let switcher = hiddenApps.byId.switcher;
      if (!switcher) return reply(Boom.notFound('app switcher not installed'));
      return reply.renderApp(switcher);
    }
  });

  // serve the app switcher
  server.route({
    path: '/api/apps',
    method: 'GET',
    handler: function (req, reply) {
      return reply(apps);
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      let id = req.params.id;
      let app = apps.byId[id];
      if (!app) return reply(Boom.notFound('Unkown app ' + id));

      if (kbnServer.status.isGreen()) {
        return reply.renderApp(app);
      } else {
        return reply.renderStatusPage();
      }
    }
  });

  server.decorate('reply', 'renderApp', function (app) {
    if (app.requireOptimizeGreen) {
      let optimizeStatus = kbnServer.status.get('optimize');
      switch (optimizeStatus && optimizeStatus.state) {
        case 'yellow':
          return this(`
            <html>
              <head><meta http-equiv="refresh" content="1"></head>
              <body>${optimizeStatus.message}</body>
            </html>
          `).code(503);

        case 'red':
          return this(`
            <html><body>${optimizeStatus.message}</body></html>
          `).code(500);
      }
    }

    let payload = {
      app: app,
      appCount: apps.length,
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
