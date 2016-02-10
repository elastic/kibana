import { format as formatUrl } from 'url';
import { readFileSync as readFile } from 'fs';
import { defaults } from 'lodash';
import Boom from 'boom';
import { resolve } from 'path';
import fromRoot from '../utils/fromRoot';
import UiExports from './ui_exports';
import UiBundle from './ui_bundle';
import UiBundleCollection from './ui_bundle_collection';
import UiBundlerEnv from './ui_bundler_env';
module.exports = async (kbnServer, server, config) => {

  let loadingGif = readFile(fromRoot('src/ui/public/loading.gif'), { encoding: 'base64'});

  let uiExports = kbnServer.uiExports = new UiExports({
    urlBasePath: config.get('server.basePath')
  });

  let bundlerEnv = new UiBundlerEnv(config.get('optimize.bundleDir'));
  bundlerEnv.addContext('env', config.get('env.name'));
  bundlerEnv.addContext('urlBasePath', config.get('server.basePath'));
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
    let bundle = await gen(UiBundle, bundlerEnv, uiExports.getAllApps(), kbnServer.plugins);
    if (bundle) bundles.add(bundle);
  }

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));
  server.exposeStaticFile('/loading.gif', resolve(__dirname, 'public/loading.gif'));

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

  const defaultInjectedVars = {};
  if (config.has('kibana')) {
    defaultInjectedVars.kbnIndex = config.get('kibana.index');
  }
  if (config.has('elasticsearch')) {
    defaultInjectedVars.esShardTimeout = config.get('elasticsearch.shardTimeout');
    defaultInjectedVars.esApiVersion = config.get('elasticsearch.apiVersion');
  }

  server.decorate('reply', 'renderApp', function (app) {
    const payload = {
      app: app,
      nav: uiExports.apps,
      version: kbnServer.version,
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: config.get('server.basePath'),
      vars: defaults(app.getInjectedVars() || {}, defaultInjectedVars),
    };

    return this.view(app.templateName, {
      app: app,
      loadingGif: loadingGif,
      kibanaPayload: payload,
      bundlePath: `${config.get('server.basePath')}/bundles`,
    });
  });
};
