/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { take } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import { UiPlugins } from '../plugins';
import { CoreContext } from '../core_context';
import { Template } from './views';
import {
  IRenderOptions,
  RenderingSetupDeps,
  InternalRenderingServiceSetup,
  RenderingMetadata,
} from './types';
import { getStylesheetPaths, AppBootstrap, getPluginsBundlePaths } from './bootstrap';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

/** @internal */
export class RenderingService {
  constructor(private readonly coreContext: CoreContext) {}

  public async setup({
    http,
    status,
    uiPlugins,
  }: RenderingSetupDeps): Promise<InternalRenderingServiceSetup> {
    http.createRouter('').get(
      {
        path: '/bootstrap.js',
        options: {
          authRequired: 'optional',
          tags: ['api'],
        },
        validate: false,
      },
      async (ctx, req, res) => {
        const uiSettings = ctx.core.uiSettings.client;

        const darkMode = await uiSettings.get('theme:darkMode');
        const themeVersion = await uiSettings.get('theme:version');
        const themeTag = `${themeVersion === 'v7' ? 'v7' : 'v8'}${darkMode ? 'dark' : 'light'}`;
        const buildHash = this.coreContext.env.packageInfo.buildNum;
        const basePath = http.basePath.serverBasePath;
        const regularBundlePath = `${basePath}/${buildHash}/bundles`;

        const styleSheetPaths = getStylesheetPaths({
          themeVersion,
          darkMode,
          basePath,
          regularBundlePath,
        });

        const bundlePaths = getPluginsBundlePaths({
          uiPlugins,
          regularBundlePath,
        });

        const jsDependencyPaths = [
          ...UiSharedDeps.jsDepFilenames.map(
            (filename) => `${regularBundlePath}/kbn-ui-shared-deps/${filename}`
          ),
          `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.jsFilename}`,
          `${regularBundlePath}/core/core.entry.js`,
          ...[...bundlePaths.values()].map((plugin) => plugin.bundlePath),
        ];

        // These paths should align with the bundle routes configured in
        // src/optimize/bundles_route/bundles_route.ts
        const publicPathMap = JSON.stringify({
          core: `${regularBundlePath}/core/`,
          'kbn-ui-shared-deps': `${regularBundlePath}/kbn-ui-shared-deps/`,
          ...Object.fromEntries(
            [...bundlePaths.entries()].map(([pluginId, plugin]) => [pluginId, plugin.publicPath])
          ),
        });

        const bootstrap = new AppBootstrap({
          themeTag,
          jsDependencyPaths,
          styleSheetPaths,
          publicPathMap,
        });

        const body = await bootstrap.getJsFile();
        const etag = bootstrap.getJsFileHash(body);

        return res.ok({
          body,
          etag,
          headers: {
            'content-type': 'application/javascript',
            'cache-control': 'must-revalidate',
          },
        });
      }
    );

    return {
      render: async (
        request,
        uiSettings,
        { includeUserSettings = true, vars }: IRenderOptions = {}
      ) => {
        const env = {
          mode: this.coreContext.env.mode,
          packageInfo: this.coreContext.env.packageInfo,
        };
        const basePath = http.basePath.get(request);
        const { serverBasePath, publicBaseUrl } = http.basePath;
        const settings = {
          defaults: uiSettings.getRegistered(),
          user: includeUserSettings ? await uiSettings.getUserProvided() : {},
        };
        const metadata: RenderingMetadata = {
          strictCsp: http.csp.strict,
          uiPublicUrl: `${basePath}/ui`,
          bootstrapScriptUrl: `${basePath}/bootstrap.js`,
          i18n: i18n.translate,
          locale: i18n.getLocale(),
          darkMode: settings.user?.['theme:darkMode']?.userValue
            ? Boolean(settings.user['theme:darkMode'].userValue)
            : false,
          injectedMetadata: {
            version: env.packageInfo.version,
            buildNumber: env.packageInfo.buildNum,
            branch: env.packageInfo.branch,
            basePath,
            serverBasePath,
            publicBaseUrl,
            env,
            anonymousStatusPage: status.isStatusPageAnonymous(),
            i18n: {
              translationsUrl: `${basePath}/translations/${i18n.getLocale()}.json`,
            },
            csp: { warnLegacyBrowsers: http.csp.warnLegacyBrowsers },
            externalUrl: http.externalUrl,
            vars: vars ?? {},
            uiPlugins: await Promise.all(
              [...uiPlugins.public].map(async ([id, plugin]) => ({
                id,
                plugin,
                config: await this.getUiConfig(uiPlugins, id),
              }))
            ),
            legacyMetadata: {
              uiSettings: settings,
            },
          },
        };

        return `<!DOCTYPE html>${renderToStaticMarkup(<Template metadata={metadata} />)}`;
      },
    };
  }

  public async stop() {}

  private async getUiConfig(uiPlugins: UiPlugins, pluginId: string) {
    const browserConfig = uiPlugins.browserConfigs.get(pluginId);

    return ((await browserConfig?.pipe(take(1)).toPromise()) ?? {}) as Record<string, any>;
  }
}
