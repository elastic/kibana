/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { BehaviorSubject } from 'rxjs';
import type { PackageInfo } from '@kbn/config';
import type { KibanaRequest, HttpAuth } from '@kbn/core-http-server';
import {
  type DarkModeValue,
  type ThemeName,
  parseDarkModeValue,
} from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalUserSettingsServiceSetup } from '@kbn/core-user-settings-server-internal';
import { getPluginsBundlePaths } from './get_plugin_bundle_paths';
import { getMFDependencyPaths } from './get_mf_dependency_paths';
import { renderMFTemplate } from './render_mf_template';
import { getBundlesHref } from '../render_utils';

export type MFBootstrapRendererFactory = (factoryOptions: MFFactoryOptions) => MFBootstrapRenderer;
export type MFBootstrapRenderer = (options: MFRenderedOptions) => Promise<MFRendererResult>;

interface MFFactoryOptions {
  /** Can be a URL, in the case of a CDN, or a base path if serving from Kibana */
  baseHref: string;
  packageInfo: PackageInfo;
  uiPlugins: UiPlugins;
  auth: HttpAuth;
  userSettingsService?: InternalUserSettingsServiceSetup;
  themeName$: BehaviorSubject<ThemeName>;
}

interface MFRenderedOptions {
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  isAnonymousPage?: boolean;
}

interface MFRendererResult {
  body: string;
  etag: string;
}

/**
 * Bootstrap renderer factory for Module Federation mode
 * 
 * Creates a renderer that generates HTML with MF runtime instead of __kbnBundles__
 */
export const mfBootstrapRendererFactory: MFBootstrapRendererFactory = ({
  packageInfo,
  baseHref,
  uiPlugins,
  auth,
  userSettingsService,
  themeName$,
}) => {
  const isAuthenticated = (request: KibanaRequest) => {
    const { status: authStatus } = auth.get(request);
    return authStatus !== 'unauthenticated';
  };

  return async function mfBootstrapRenderer({
    uiSettingsClient,
    request,
    isAnonymousPage = false,
  }) {
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

    const colorMode = darkMode === false ? 'light' : darkMode === true ? 'dark' : 'system';
    const themeTagName = themeName;
    const bundlesHref = getBundlesHref(baseHref);

    const bundlePaths = getPluginsBundlePaths({
      uiPlugins,
      bundlesHref,
      isAnonymousPage,
    });

    // Get MF-specific dependency paths
    const mfPaths = getMFDependencyPaths(bundlesHref, bundlePaths);

    // Build public path map (still needed for asset resolution)
    const publicPathMap = JSON.stringify({
      core: `${bundlesHref}/core/`,
      ...Object.fromEntries(
        [...bundlePaths.entries()].map(([pluginId, plugin]) => [pluginId, plugin.publicPath])
      ),
    });

    const body = renderMFTemplate({
      colorMode,
      themeTagName,
      coreRemoteEntry: mfPaths.coreRemoteEntry,
      plugins: mfPaths.plugins,
      publicPathMap,
    });

    const hash = createHash('sha256');
    hash.update(body);
    const etag = hash.digest('hex');

    return {
      body,
      etag,
    };
  };
};

/**
 * Check if MF mode is enabled
 */
export function isMFModeEnabled(): boolean {
  return process.env.KBN_USE_MODULE_FEDERATION === 'true';
}
