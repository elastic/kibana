import { format as formatUrl } from 'url';
import { readFileSync as readFile } from 'fs';
import { defaults } from 'lodash';
import { props } from 'bluebird';
import Boom from 'boom';
import { reduce as reduceAsync } from 'bluebird';
import { resolve } from 'path';
import fromRoot from '../utils/from_root';
import UiExports from './ui_exports';
import UiBundle from './ui_bundle';
import UiBundleCollection from './ui_bundle_collection';
import UiBundlerEnv from './ui_bundler_env';
import langParser from 'accept-language-parser';
import UiI18n from './ui_i18n';

export default async (kbnServer, server, config) => {
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

  const defaultLocale = config.get('i18n.locale');

  // render all views from the ui/views directory
  server.setupViews(resolve(__dirname, 'views'));

  server.route({
    path: '/app/{id}',
    method: 'GET',
    async handler(req, reply) {
      const id = req.params.id;
      const app = uiExports.apps.byId[id];
      if (!app) return reply(Boom.notFound('Unknown app ' + id));

      const acceptLanguageStr = req.headers['accept-language'];
      const acceptLanguages = langParser.parse(acceptLanguageStr);

      try {
        if (kbnServer.status.isGreen()) {
          await reply.renderApp(app, acceptLanguages);
        } else {
          await reply.renderStatusPage();
        }
      } catch (err) {
        reply(Boom.wrap(err));
      }
    }
  });

  async function getKibanaPayload({ app, request, includeUserProvidedConfig }) {
    const uiSettings = server.uiSettings();

    return {
  server.decorate('reply', 'renderApp', async function (app, acceptLanguages) {
    const isElasticsearchPluginRed = server.plugins.elasticsearch.status.state === 'red';
    const uiSettings = server.uiSettings();
    const payload = {
      app: app,
      nav: uiExports.navLinks.inOrder,
      version: kbnServer.version,
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: config.get('server.basePath'),
      serverName: config.get('server.name'),
      devMode: config.get('env.dev'),
      uiSettings: await props({
        defaults: uiSettings.getDefaults(),
        user: includeUserProvidedConfig && uiSettings.getUserProvided(request)
      }),
      vars: await reduceAsync(
        uiExports.injectedVarsReplacers,
        async (acc, replacer) => await replacer(acc, request, server),
        defaults(await app.getInjectedVars() || {}, uiExports.defaultInjectedVars)
      ),
    };
  }

  async function renderApp({ app, reply, includeUserProvidedConfig = true }) {
    try {
    if (kibanaTranslations.length <= 0) {
      const locale = getTranslationLocale(acceptLanguages, defaultLocale, server);
      kibanaTranslations = await server.plugins.i18n.getRegisteredLocaleTranslations(locale);
    }
    const translations = await UiI18n.getLocaleTranslations(acceptLanguages, defaultLocale, server);
    let locale = UiI18n.getTranslationLocale(acceptLanguages, defaultLocale, server);
    let translations = await UiI18n.getLocaleTranslations(locale, server);
    if (locale !== defaultLocale) {
      translations = await UiI18n.updateMissingTranslations(defaultLocale, translations, server);
    }
    const i18n = new UiI18n.I18n(translations);
      return reply.view(app.templateName, {
        app,
        kibanaPayload: await getKibanaPayload({
          app,
          request: reply.request,
          includeUserProvidedConfig
        }),
        bundlePath: `${config.get('server.basePath')}/bundles`,
        i18n: i18n,
      });
    } catch (err) {
      reply(err);
    }
  }

  server.decorate('reply', 'renderApp', function (app) {
    return renderApp({
      app,
      reply: this,
      includeUserProvidedConfig: true,
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
