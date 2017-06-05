import { defaults, _ } from 'lodash';
import { props } from 'bluebird';
import Boom from 'boom';
import { reduce as reduceAsync } from 'bluebird';
import { resolve } from 'path';

import UiExports from './ui_exports';
import UiBundle from './ui_bundle';
import UiBundleCollection from './ui_bundle_collection';
import UiBundlerEnv from './ui_bundler_env';
import { UiI18n } from './ui_i18n';

export { uiSettingsMixin } from './ui_settings';

export default async (kbnServer, server, config) => {
  const uiExports = kbnServer.uiExports = new UiExports({
    urlBasePath: config.get('server.basePath')
  });

  const uiI18n = kbnServer.uiI18n = new UiI18n(config.get('i18n.defaultLocale'));
  uiI18n.addUiExportConsumer(uiExports);

  const bundlerEnv = new UiBundlerEnv(config.get('optimize.bundleDir'));
  bundlerEnv.addContext('env', config.get('env.name'));
  bundlerEnv.addContext('urlBasePath', config.get('server.basePath'));
  bundlerEnv.addContext('sourceMaps', config.get('optimize.sourceMaps'));
  bundlerEnv.addContext('kbnVersion', config.get('pkg.version'));
  bundlerEnv.addContext('buildNum', config.get('pkg.buildNum'));
  uiExports.addConsumer(bundlerEnv);

  for (const plugin of kbnServer.plugins) {
    uiExports.consumePlugin(plugin);
  }

  const bundles = kbnServer.bundles = new UiBundleCollection(bundlerEnv, config.get('optimize.bundleFilter'));

  for (const app of uiExports.getAllApps()) {
    bundles.addApp(app);
  }

  for (const gen of uiExports.getBundleProviders()) {
    const bundle = await gen(UiBundle, bundlerEnv, uiExports.getAllApps(), kbnServer.plugins);
    if (bundle) bundles.add(bundle);
  }

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));

  server.route({
    path: '/app/{id}',
    method: 'GET',
    async handler(req, reply) {
      const id = req.params.id;
      const app = uiExports.apps.byId[id];
      if (!app) return reply(Boom.notFound('Unknown app ' + id));

      try {
        if (kbnServer.status.isGreen()) {
          await reply.renderApp(app);
        } else {
          await reply.renderStatusPage();
        }
      } catch (err) {
        reply(Boom.wrap(err));
      }
    }
  });

  async function getKibanaPayload({ app, request, includeUserProvidedConfig, injectedVarsOverrides }) {
    const uiSettings = server.uiSettings();
    const translations = await uiI18n.getTranslationsForRequest(request);

    return {
      app: app,
      nav: uiExports.navLinks.inOrder,
      version: kbnServer.version,
      branch: config.get('pkg.branch'),
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: config.get('server.basePath'),
      serverName: config.get('server.name'),
      devMode: config.get('env.dev'),
      translations: translations,
      uiSettings: await props({
        defaults: uiSettings.getDefaults(),
        user: includeUserProvidedConfig && uiSettings.getUserProvided(request)
      }),
      vars: await reduceAsync(
        uiExports.injectedVarsReplacers,
        async (acc, replacer) => await replacer(acc, request, server),
        defaults(injectedVarsOverrides, await app.getInjectedVars() || {}, uiExports.defaultInjectedVars)
      ),
    };
  }

  async function renderApp({ app, reply, includeUserProvidedConfig = true, injectedVarsOverrides = {} }) {
    try {
      const request = reply.request;
      const translations = await uiI18n.getTranslationsForRequest(request);

      return reply.view(app.templateName, {
        app,
        kibanaPayload: await getKibanaPayload({
          app,
          request,
          includeUserProvidedConfig,
          injectedVarsOverrides
        }),
        bundlePath: `${config.get('server.basePath')}/bundles`,
        i18n: key => _.get(translations, key, ''),
      });
    } catch (err) {
      reply(err);
    }
  }

  server.decorate('reply', 'renderApp', function (app, injectedVarsOverrides) {
    return renderApp({
      app,
      reply: this,
      includeUserProvidedConfig: true,
      injectedVarsOverrides,
    });
  });

  server.decorate('reply', 'renderAppWithDefaultConfig', function (app) {
    return renderApp({
      app,
      reply: this,
      includeUserProvidedConfig: false,
    });
  });
};
