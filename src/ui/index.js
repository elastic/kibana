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
import i18nPlugin from '../core_plugins/i18n/server/i18n/index';
import langParser from 'accept-language-parser';

let kibanaTranslations = [];
let acceptLanguages = '';

const DEFAULT_LOCALE = 'en';

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
      acceptLanguages = langParser.parse(acceptLanguageStr);

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

  async function getKibanaPayload({ app, request, includeUserProvidedConfig }) {
    const uiSettings = server.uiSettings();

    return {
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
        const language = await getTranslationLanguage(acceptLanguages);
        kibanaTranslations = await i18nPlugin.getRegisteredLanguageTranslations(language);
      }
      return reply.view(app.templateName, {
        app,
        kibanaPayload: await getKibanaPayload({
          app,
          request: reply.request,
          includeUserProvidedConfig
        }),
        bundlePath: `${config.get('server.basePath')}/bundles`,
        welcomeMessage: translate('CORE-WELCOME_MESSAGE'),
        welcomeError: translate('CORE-WELCOME_ERROR'),
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

function translate(key) {
  if (!(key in kibanaTranslations)) {
    return null;
  }
  return kibanaTranslations[key];
}

function getTranslationLocale(acceptLanguages) {
  let localeStr = '';
  let foundLang = false;

  if (acceptLanguages === null || acceptLanguages.length <= 0) {
    return DEFAULT_LOCALE;
  }

  const acceptLangsLen = acceptLanguages.length;
  const registeredLocales = i18nPlugin.getRegisteredTranslationLocales();

  for (let indx = 0; indx < acceptLangsLen; indx++) {
    const language = acceptLanguages[indx];
    if (language.region) {
      localeStr = language.code + '-' + language.region;
    } else {
      localeStr = language.code;
    }
    if (registeredLocales.indexOf(localeStr) > -1) {
      foundLang = true;
      break;
    }
  }
  if (foundLang) {
    return localeStr;
  }

  const regLangsLen = registeredLocales.length;
  for (let indx = 0; indx < acceptLangsLen; indx++) {
    const language = acceptLanguages[indx];
    localeStr = language.code;
    for (let regIndx = 0; regIndx < regLangsLen; regIndx++) {
      const locale = registeredLocales[regIndx];
      if (locale.match('^' + locale)) {
        localeStr = locale;
        foundLang = true;
        break;
      }
    }
    if (foundLang) {
      break;
    }
  }
  if (foundLang) {
    return localeStr;
  }

  return DEFAULT_LOCALE;
}
