/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import { PackageInfo } from '@kbn/config';
import { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import type { KibanaRequest, HttpAuth } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { InternalUserSettingsServiceSetup } from '@kbn/core-user-settings-server-internal';
import { getPluginsBundlePaths } from './get_plugin_bundle_paths';
import { getJsDependencyPaths } from './get_js_dependency_paths';
import { getThemeTag } from './get_theme_tag';
import { renderTemplate } from './render_template';
import { getBundlesHref } from '../render_utils';

export type BootstrapRendererFactory = (factoryOptions: FactoryOptions) => BootstrapRenderer;
export type BootstrapRenderer = (options: RenderedOptions) => Promise<RendererResult>;

interface FactoryOptions {
  /** Can be a URL, in the case of a CDN, or a base path if serving from Kibana */
  baseHref: string;
  packageInfo: PackageInfo;
  uiPlugins: UiPlugins;
  auth: HttpAuth;
  userSettingsService?: InternalUserSettingsServiceSetup;
}

interface RenderedOptions {
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  isAnonymousPage?: boolean;
}

interface RendererResult {
  body: string;
  etag: string;
}

export const bootstrapRendererFactory: BootstrapRendererFactory = ({
  packageInfo,
  baseHref,
  uiPlugins,
  auth,
  userSettingsService,
}) => {
  const isAuthenticated = (request: KibanaRequest) => {
    const { status: authStatus } = auth.get(request);
    // status is 'unknown' when auth is disabled. we just need to not be `unauthenticated` here.
    return authStatus !== 'unauthenticated';
  };

  return async function bootstrapRenderer({ uiSettingsClient, request, isAnonymousPage = false }) {
    let darkMode = false;
    const themeVersion: ThemeVersion = 'v8';

    try {
      const authenticated = isAuthenticated(request);

      if (authenticated) {
        const userSettingDarkMode = await userSettingsService?.getUserSettingDarkMode(request);

        if (userSettingDarkMode !== undefined) {
          darkMode = userSettingDarkMode;
        } else {
          darkMode = await uiSettingsClient.get('theme:darkMode');
        }
      }
    } catch (e) {
      // just use the default values in case of connectivity issues with ES
    }

    const themeTag = getThemeTag({
      themeVersion,
      darkMode,
    });
    const buildHash = packageInfo.buildNum;
    const bundlesHref = getBundlesHref(baseHref, String(buildHash));

    const bundlePaths = getPluginsBundlePaths({
      uiPlugins,
      bundlesHref,
      isAnonymousPage,
    });

    const jsDependencyPaths = getJsDependencyPaths(bundlesHref, bundlePaths);

    // These paths should align with the bundle routes configured in
    // src/optimize/bundles_route/bundles_route.ts
    const publicPathMap = JSON.stringify({
      core: `${bundlesHref}/core/`,
      'kbn-ui-shared-deps-src': `${bundlesHref}/kbn-ui-shared-deps-src/`,
      'kbn-ui-shared-deps-npm': `${bundlesHref}/kbn-ui-shared-deps-npm/`,
      'kbn-monaco': `${bundlesHref}/kbn-monaco/`,
      ...Object.fromEntries(
        [...bundlePaths.entries()].map(([pluginId, plugin]) => [pluginId, plugin.publicPath])
      ),
    });

    const body = renderTemplate({
      themeTag,
      jsDependencyPaths,
      publicPathMap,
    });

    const hash = createHash('sha1');
    hash.update(body);
    const etag = hash.digest('hex');

    return {
      body,
      etag,
    };
  };
};
