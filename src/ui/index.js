module.exports = async (kbnServer, server, config) => {
  let _ = require('lodash');
  let Boom = require('boom');
  let formatUrl = require('url').format;
  let { resolve } = require('path');
  let readFile = require('fs').readFileSync;

  let fromRoot = require('../utils/fromRoot');
  let UiExports = require('./UiExports');
  let UiBundle = require('./UiBundle');
  let UiBundleCollection = require('./UiBundleCollection');
  let UiBundlerEnv = require('./UiBundlerEnv');
  let loadingGif = readFile(fromRoot('src/ui/public/loading.gif'), { encoding: 'base64'});

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

  let bundles = kbnServer.bundles = new UiBundleCollection(bundlerEnv, config.get('optimize.bundleFilter'));

  for (let app of uiExports.getAllApps()) {
    bundles.addApp(app);
  }

  for (let gen of uiExports.getBundleProviders()) {
    let bundle = await gen(UiBundle, bundlerEnv, uiExports.getAllApps());
    if (bundle) bundles.add(bundle);
  }

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));
  server.exposeStaticFile('/loading.gif', resolve(__dirname, 'public/loading.gif'));

  // serve the app switcher
  server.route({
    path: '/apps',
    method: 'GET',
    handler: function (req, reply) {
      let switcher = uiExports.getHiddenApp('appSwitcher');
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
      if (!app) return reply(Boom.notFound('Unknown app ' + id));

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
      appCount: uiExports.apps.size,
      version: kbnServer.version,
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      vars: app.getInjectedVars()
    };

    return this.view(app.templateName, {
      app: app,
      loadingGif: loadingGif,
      kibanaPayload: payload
    });
  });
};
