/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { take } from 'rxjs/operators';
import { createHash } from 'crypto';
import { props, reduce as reduceAsync } from 'bluebird';
import Boom from 'boom';
import { resolve } from 'path';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AppBootstrap } from './bootstrap';
import { mergeVariables } from './lib';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot } from '../../../core/server/utils';

export function uiRenderMixin(kbnServer, server, config) {
  function replaceInjectedVars(request, injectedVars) {
    const { injectedVarsReplacers = [] } = kbnServer.uiExports;

    return reduceAsync(
      injectedVarsReplacers,
      async (acc, replacer) => await replacer(acc, request, kbnServer.server),
      injectedVars
    );
  }

  let defaultInjectedVars = {};
  kbnServer.afterPluginsInit(() => {
    const { defaultInjectedVarProviders = [] } = kbnServer.uiExports;
    defaultInjectedVars = defaultInjectedVarProviders.reduce(
      (allDefaults, { fn, pluginSpec }) =>
        mergeVariables(
          allDefaults,
          fn(kbnServer.server, pluginSpec.readConfigValue(kbnServer.config, []))
        ),
      {}
    );
  });

  // render all views from ./views
  server.setupViews(resolve(__dirname, 'views'));

  server.exposeStaticDir(
    '/node_modules/@elastic/eui/dist/{path*}',
    fromRoot('node_modules/@elastic/eui/dist')
  );
  server.exposeStaticDir(
    '/node_modules/@kbn/ui-framework/dist/{path*}',
    fromRoot('node_modules/@kbn/ui-framework/dist')
  );
  server.exposeStaticDir(
    '/node_modules/@elastic/charts/dist/{path*}',
    fromRoot('node_modules/@elastic/charts/dist')
  );

  const translationsCache = { translations: null, hash: null };
  server.route({
    path: '/translations/{locale}.json',
    method: 'GET',
    config: { auth: false },
    handler(request, h) {
      // Kibana server loads translations only for a single locale
      // that is specified in `i18n.locale` config value.
      const { locale } = request.params;
      if (i18n.getLocale() !== locale.toLowerCase()) {
        throw Boom.notFound(`Unknown locale: ${locale}`);
      }

      // Stringifying thousands of labels and calculating hash on the resulting
      // string can be expensive so it makes sense to do it once and cache.
      if (translationsCache.translations == null) {
        translationsCache.translations = JSON.stringify(i18n.getTranslation());
        translationsCache.hash = createHash('sha1')
          .update(translationsCache.translations)
          .digest('hex');
      }

      return h
        .response(translationsCache.translations)
        .header('cache-control', 'must-revalidate')
        .header('content-type', 'application/json')
        .etag(translationsCache.hash);
    },
  });

  // register the bootstrap.js route after plugins are initialized so that we can
  // detect if any default auth strategies were registered
  kbnServer.afterPluginsInit(() => {
    const authEnabled = !!server.auth.settings.default;

    server.route({
      path: '/bundles/app/{id}/bootstrap.js',
      method: 'GET',
      config: {
        tags: ['api'],
        auth: authEnabled ? { mode: 'try' } : false,
      },
      async handler(request, h) {
        const { id } = request.params;
        const app = server.getUiAppById(id) || server.getHiddenUiAppById(id);
        const isCore = !app;

        const uiSettings = request.getUiSettingsService();
        const darkMode =
          !authEnabled || request.auth.isAuthenticated
            ? await uiSettings.get('theme:darkMode')
            : false;

        const basePath = config.get('server.basePath');
        const regularBundlePath = `${basePath}/bundles`;
        const dllBundlePath = `${basePath}/built_assets/dlls`;
        const styleSheetPaths = [
          `${dllBundlePath}/vendors.style.dll.css`,
          ...(darkMode
            ? [
              `${basePath}/node_modules/@elastic/eui/dist/eui_theme_dark.css`,
              `${basePath}/node_modules/@kbn/ui-framework/dist/kui_dark.css`,
              `${basePath}/node_modules/@elastic/charts/dist/theme_only_dark.css`,
            ]
            : [
              `${basePath}/node_modules/@elastic/eui/dist/eui_theme_light.css`,
              `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
              `${basePath}/node_modules/@elastic/charts/dist/theme_only_light.css`,
            ]),
          `${regularBundlePath}/${darkMode ? 'dark' : 'light'}_theme.style.css`,
          `${regularBundlePath}/commons.style.css`,
          ...(!isCore ? [`${regularBundlePath}/${app.getId()}.style.css`] : []),
          ...kbnServer.uiExports.styleSheetPaths
            .filter(path => path.theme === '*' || path.theme === (darkMode ? 'dark' : 'light'))
            .map(path =>
              path.localPath.endsWith('.scss')
                ? `${basePath}/built_assets/css/${path.publicPath}`
                : `${basePath}/${path.publicPath}`
            )
            .reverse(),
        ];

        const bootstrap = new AppBootstrap({
          templateData: {
            appId: isCore ? 'core' : app.getId(),
            regularBundlePath,
            dllBundlePath,
            styleSheetPaths,
          },
        });

        const body = await bootstrap.getJsFile();
        const etag = await bootstrap.getJsFileHash();

        return h
          .response(body)
          .header('cache-control', 'must-revalidate')
          .header('content-type', 'application/javascript')
          .etag(etag);
      },
    });
  });

  server.route({
    path: '/app/{id}/{any*}',
    method: 'GET',
    async handler(req, h) {
      const id = req.params.id;
      const app = server.getUiAppById(id);

      try {
        if (kbnServer.status.isGreen()) {
          return await h.renderApp(app);
        } else {
          return await h.renderStatusPage();
        }
      } catch (err) {
        throw Boom.boomify(err);
      }
    },
  });

  async function getUiSettings({ request, includeUserProvidedConfig }) {
    const uiSettings = request.getUiSettingsService();
    return props({
      defaults: uiSettings.getRegistered(),
      user: includeUserProvidedConfig && uiSettings.getUserProvided(),
    });
  }

  function getLegacyKibanaPayload({ app, basePath, uiSettings }) {
    return {
      app,
      bundleId: `app:${app.getId()}`,
      nav: server.getUiNavLinks(),
      version: kbnServer.version,
      branch: config.get('pkg.branch'),
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      serverName: config.get('server.name'),
      devMode: config.get('env.dev'),
      basePath,
      uiSettings,
    };
  }

  async function renderApp({
    app,
    h,
    includeUserProvidedConfig = true,
    injectedVarsOverrides = {},
  }) {
    const request = h.request;
    const basePath = request.getBasePath();
    const uiSettings = await getUiSettings({ request, includeUserProvidedConfig });
    app = app || { getId: () => 'core' };

    const legacyMetadata = getLegacyKibanaPayload({
      app,
      basePath,
      uiSettings,
    });

    // Get the list of new platform plugins.
    // Convert the Map into an array of objects so it is JSON serializable and order is preserved.
    const uiPluginConfigs = kbnServer.newPlatform.__internals.uiPlugins.browserConfigs;
    const uiPlugins = await Promise.all([
      ...kbnServer.newPlatform.__internals.uiPlugins.public.entries(),
    ].map(async ([id, plugin]) => {
      const config$ = uiPluginConfigs.get(id);
      if (config$) {
        return { id, plugin, config: await config$.pipe(take(1)).toPromise() };
      } else {
        return { id, plugin, config: {} };
      }
    }));
    const { strict, warnLegacyBrowsers, header } = kbnServer.newPlatform.setup.core.http.csp;

    const response = h.view('ui_app', {
      strictCsp: strict,
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/bundles/app/${app.getId()}/bootstrap.js`,
      i18n: (id, options) => i18n.translate(id, options),
      locale: i18n.getLocale(),
      darkMode: get(uiSettings.user, ['theme:darkMode', 'userValue'], false),

      injectedMetadata: {
        version: kbnServer.version,
        buildNumber: config.get('pkg.buildNum'),
        branch: config.get('pkg.branch'),
        basePath,
        env: kbnServer.newPlatform.env,
        legacyMode: app.getId() !== 'core',
        i18n: {
          translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
        },
        csp: {
          warnLegacyBrowsers,
        },
        vars: await replaceInjectedVars(
          request,
          mergeVariables(
            injectedVarsOverrides,
            app ? await server.getInjectedUiAppVars(app.getId()) : {},
            defaultInjectedVars
          )
        ),

        uiPlugins,

        legacyMetadata,
      },
    });

    response.header('content-security-policy', header);

    return response;
  }

  server.decorate('toolkit', 'renderApp', function (app, injectedVarsOverrides) {
    return renderApp({
      app,
      h: this,
      includeUserProvidedConfig: true,
      injectedVarsOverrides,
    });
  });

  server.decorate('toolkit', 'renderAppWithDefaultConfig', function (app) {
    return renderApp({
      app,
      h: this,
      includeUserProvidedConfig: false,
    });
  });
}
