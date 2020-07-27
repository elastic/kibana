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

import { createHash } from 'crypto';
import Boom from 'boom';
import Path from 'path';
import { i18n } from '@kbn/i18n';
import * as UiSharedDeps from '@kbn/ui-shared-deps';
import { AppBootstrap } from './bootstrap';
import { getApmConfig } from '../apm';

/**
 * @typedef {import('../../server/kbn_server').default} KbnServer
 * @typedef {import('../../server/kbn_server').ResponseToolkit} ResponseToolkit
 */

/**
 *
 * @param {KbnServer} kbnServer
 * @param {KbnServer['server']} server
 * @param {KbnServer['config']} config
 */
export function uiRenderMixin(kbnServer, server, config) {
  // render all views from ./views
  server.setupViews(Path.resolve(__dirname, 'views'));

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

        const themeVersion =
          !authEnabled || request.auth.isAuthenticated
            ? await uiSettings.get('theme:version')
            : 'v7';

        const themeTag = `${themeVersion === 'v7' ? 'v7' : 'v8'}${darkMode ? 'dark' : 'light'}`;

        const buildHash = server.newPlatform.env.packageInfo.buildNum;
        const basePath = config.get('server.basePath');

        const regularBundlePath = `${basePath}/${buildHash}/bundles`;

        const styleSheetPaths = [
          `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
          ...(darkMode
            ? [
                themeVersion === 'v7'
                  ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.darkCssDistFilename}`
                  : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.darkV8CssDistFilename}`,
                `${basePath}/node_modules/@kbn/ui-framework/dist/kui_dark.css`,
                `${regularBundlePath}/dark_theme.style.css`,
              ]
            : [
                themeVersion === 'v7'
                  ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`
                  : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightV8CssDistFilename}`,
                `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
                `${regularBundlePath}/light_theme.style.css`,
              ]),
          ...(isCore
            ? []
            : [
                `${regularBundlePath}/${app.getId()}.style.css`,
                ...kbnServer.uiExports.styleSheetPaths
                  .filter(
                    (path) => path.theme === '*' || path.theme === (darkMode ? 'dark' : 'light')
                  )
                  .map((path) =>
                    path.localPath.endsWith('.scss')
                      ? `${basePath}/${buildHash}/built_assets/css/${path.publicPath}`
                      : `${basePath}/${path.publicPath}`
                  )
                  .reverse(),
              ]),
        ];

        const kpUiPlugins = kbnServer.newPlatform.__internals.uiPlugins;
        const kpPluginPublicPaths = new Map();
        const kpPluginBundlePaths = new Set();

        // recursively iterate over the kpUiPlugin ids and their required bundles
        // to populate kpPluginPublicPaths and kpPluginBundlePaths
        (function readKpPlugins(ids) {
          for (const id of ids) {
            if (kpPluginPublicPaths.has(id)) {
              continue;
            }

            kpPluginPublicPaths.set(id, `${regularBundlePath}/plugin/${id}/`);
            kpPluginBundlePaths.add(`${regularBundlePath}/plugin/${id}/${id}.plugin.js`);
            readKpPlugins(kpUiPlugins.internal.get(id).requiredBundles);
          }
        })(kpUiPlugins.public.keys());

        const jsDependencyPaths = [
          ...UiSharedDeps.jsDepFilenames.map(
            (filename) => `${regularBundlePath}/kbn-ui-shared-deps/${filename}`
          ),
          `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.jsFilename}`,

          `${regularBundlePath}/core/core.entry.js`,
          ...kpPluginBundlePaths,
        ];

        // These paths should align with the bundle routes configured in
        // src/optimize/bundles_route/bundles_route.ts
        const publicPathMap = JSON.stringify({
          core: `${regularBundlePath}/core/`,
          'kbn-ui-shared-deps': `${regularBundlePath}/kbn-ui-shared-deps/`,
          ...Object.fromEntries(kpPluginPublicPaths),
        });

        const bootstrap = new AppBootstrap({
          templateData: {
            themeTag,
            jsDependencyPaths,
            styleSheetPaths,
            publicPathMap,
            legacyBundlePath: isCore ? undefined : `${regularBundlePath}/${app.getId()}.bundle.js`,
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

  async function renderApp(
    h,
    app = { getId: () => 'core' },
    includeUserSettings = true,
    overrides = {}
  ) {
    const { http } = kbnServer.newPlatform.setup.core;
    const {
      rendering,
      legacy,
      savedObjectsClientProvider: savedObjects,
    } = kbnServer.newPlatform.__internals;
    const uiSettings = kbnServer.newPlatform.start.core.uiSettings.asScopedToClient(
      savedObjects.getClient(h.request)
    );
    const vars = await legacy.getVars(app.getId(), h.request, {
      apmConfig: getApmConfig(h.request.path),
      ...overrides,
    });
    const content = await rendering.render(h.request, uiSettings, {
      app,
      includeUserSettings,
      vars,
    });

    return h.response(content).type('text/html').header('content-security-policy', http.csp.header);
  }

  server.decorate('toolkit', 'renderApp', function (app, overrides) {
    return renderApp(this, app, true, overrides);
  });

  server.decorate('toolkit', 'renderAppWithDefaultConfig', function (app) {
    return renderApp(this, app, false);
  });
}
