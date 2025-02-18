/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { BehaviorSubject } from 'rxjs';
import { PackageInfo } from '@kbn/config';
import type { KibanaRequest, HttpAuth } from '@kbn/core-http-server';
import {
  type DarkModeValue,
  type ThemeName,
  parseDarkModeValue,
} from '@kbn/core-ui-settings-common';
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
  themeName$: BehaviorSubject<ThemeName>;
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
  themeName$,
}) => {
  const isAuthenticated = (request: KibanaRequest) => {
    const { status: authStatus } = auth.get(request);
    // status is 'unknown' when auth is disabled. we just need to not be `unauthenticated` here.
    return authStatus !== 'unauthenticated';
  };

  return async function bootstrapRenderer({ uiSettingsClient, request, isAnonymousPage = false }) {
    let darkMode: DarkModeValue = false;
    const themeName = themeName$.getValue();

    try {
      const authenticated = isAuthenticated(request);

      if (authenticated) {
        const userSettingDarkMode = await userSettingsService?.getUserSettingDarkMode(request);

        if (userSettingDarkMode !== undefined) {
          darkMode = userSettingDarkMode;
        } else {
          darkMode = parseDarkModeValue(await uiSettingsClient.get('theme:darkMode'));
        }
      }
    } catch (e) {
      // just use the default values in case of connectivity issues with ES
    }

    // keeping legacy themeTag support - note that the browser is now overriding it during setup.
    if (darkMode === 'system') {
      darkMode = false;
    }

    const themeTag = getThemeTag({
      name: !themeName || themeName === 'amsterdam' ? 'v8' : themeName,
      darkMode,
    });
    const bundlesHref = getBundlesHref(baseHref);

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

    const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
    hash.update(body);
    const etag = hash.digest('hex');

    return {
      body,
      etag,
    };
  };
};
