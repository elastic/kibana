/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Boom from '@hapi/boom';
import * as UiSharedDeps from '@kbn/ui-shared-deps';
import { KibanaRequest } from '../../../core/server';
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
  const authEnabled = !!server.auth.settings.default;
  server.route({
    path: '/bootstrap.js',
    method: 'GET',
    config: {
      tags: ['api'],
      auth: authEnabled ? { mode: 'try' } : false,
    },
    async handler(request, h) {
      const soClient = kbnServer.newPlatform.start.core.savedObjects.getScopedClient(
        KibanaRequest.from(request)
      );
      const uiSettings = kbnServer.newPlatform.start.core.uiSettings.asScopedToClient(soClient);

      const darkMode =
        !authEnabled || request.auth.isAuthenticated
          ? await uiSettings.get('theme:darkMode')
          : false;

      const themeVersion =
        !authEnabled || request.auth.isAuthenticated ? await uiSettings.get('theme:version') : 'v7';

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
              `${basePath}/ui/legacy_dark_theme.css`,
            ]
          : [
              themeVersion === 'v7'
                ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`
                : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightV8CssDistFilename}`,
              `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
              `${basePath}/ui/legacy_light_theme.css`,
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

  server.route({
    path: '/app/{id}/{any*}',
    method: 'GET',
    async handler(req, h) {
      try {
        return await h.renderApp();
      } catch (err) {
        throw Boom.boomify(err);
      }
    },
  });

  async function renderApp(h) {
    const { http } = kbnServer.newPlatform.setup.core;
    const { savedObjects } = kbnServer.newPlatform.start.core;
    const { rendering } = kbnServer.newPlatform.__internals;
    const req = KibanaRequest.from(h.request);
    const uiSettings = kbnServer.newPlatform.start.core.uiSettings.asScopedToClient(
      savedObjects.getScopedClient(req)
    );
    const vars = {
      apmConfig: getApmConfig(h.request.path),
    };
    const content = await rendering.render(h.request, uiSettings, {
      includeUserSettings: true,
      vars,
    });

    return h.response(content).type('text/html').header('content-security-policy', http.csp.header);
  }

  server.decorate('toolkit', 'renderApp', function () {
    return renderApp(this);
  });
}
