module.exports = async (kbnServer, server, config) => {
  let { defaults } = require('lodash');
  const Boom = require('boom');
  const formatUrl = require('url').format;
  let { resolve } = require('path');
  const readFile = require('fs').readFileSync;

  const fromRoot = require('../utils/fromRoot');
  const UiExports = require('./UiExports');
  const UiBundle = require('./UiBundle');
  const UiBundleCollection = require('./UiBundleCollection');
  const UiBundlerEnv = require('./UiBundlerEnv');
  const loadingGif = readFile(fromRoot('src/ui/public/loading.gif'), { encoding: 'base64'});

  const uiExports = kbnServer.uiExports = new UiExports({
    urlBasePath: config.get('server.basePath')
  });

  const bundlerEnv = new UiBundlerEnv(config.get('optimize.bundleDir'));
  bundlerEnv.addContext('env', config.get('env.name'));
  bundlerEnv.addContext('urlBasePath', config.get('server.basePath'));
  bundlerEnv.addContext('sourceMaps', config.get('optimize.sourceMaps'));
  bundlerEnv.addContext('kbnVersion', config.get('pkg.version'));
  bundlerEnv.addContext('buildNum', config.get('pkg.buildNum'));
  uiExports.addConsumer(bundlerEnv);

  for (let plugin of kbnServer.plugins) {
    uiExports.consumePlugin(plugin);
  }

  const bundles = kbnServer.bundles = new UiBundleCollection(bundlerEnv, config.get('optimize.bundleFilter'));

  for (let app of uiExports.getAllApps()) {
    bundles.addApp(app);
  }

  for (let gen of uiExports.getBundleProviders()) {
    const bundle = await gen(UiBundle, bundlerEnv, uiExports.getAllApps());
    if (bundle) bundles.add(bundle);
  }

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));
  server.exposeStaticFile('/loading.gif', resolve(__dirname, 'public/loading.gif'));

  server.route({
    path: '/app/{id}',
    method: 'GET',
    handler: function (req, reply) {
      const id = req.params.id;
      const app = uiExports.apps.byId[id];
      if (!app) return reply(Boom.notFound('Unknown app ' + id));

      if (kbnServer.status.isGreen()) {
        return reply.renderApp(app);
      } else {
        return reply.renderStatusPage();
      }
    }
  });

  server.decorate('reply', 'renderApp', function (app) {
    const payload = {
      app: app,
      nav: uiExports.apps,
      version: kbnServer.version,
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: config.get('server.basePath'),
      vars: defaults(app.getInjectedVars() || {}, uiExports.defaultInjectedVars),
    };

    return this.view(app.templateName, {
      app: app,
      loadingGif: loadingGif,
      kibanaPayload: payload,
      bundlePath: `${config.get('server.basePath')}/bundles`,
    });
  });
};
