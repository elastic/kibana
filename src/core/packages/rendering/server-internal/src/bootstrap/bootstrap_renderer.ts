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
import { getJsDependencyPaths } from './get_js_dependency_paths';
import { renderTemplate } from './render_template';
import { getBundlesHref } from '../render_utils';

// Vite config is stored in global by the CLI dev mode
interface ViteConfig {
  serverUrl: string;
  pluginIds: string[];
  pluginDependencies?: Record<string, string[]>;
}

function getViteConfig(): ViteConfig | null {
  return (global as any).__kbnViteConfig || null;
}

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

    const colorMode = darkMode === false ? 'light' : darkMode === true ? 'dark' : 'system';
    const themeTagName = themeName;
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

    // Check if Vite dev server is configured
    // Note: Vite config is set via global.__kbnViteConfig in dev mode (disable with --no-vite)
    let viteConfigData:
      | { serverUrl: string; pluginIds: string[]; pluginDependencies: Record<string, string[]> }
      | undefined;
    try {
      const viteConfig = getViteConfig();
      if (viteConfig && viteConfig.serverUrl && Array.isArray(viteConfig.pluginIds)) {
        // eslint-disable-next-line no-console
        console.log('[bootstrap] Using Vite ESM mode with', viteConfig.pluginIds.length, 'plugins');
        viteConfigData = {
          serverUrl: viteConfig.serverUrl,
          pluginIds: viteConfig.pluginIds,
          pluginDependencies: viteConfig.pluginDependencies || {},
        };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('[bootstrap] Vite config not available, using traditional loading');
    }

    const body = renderTemplate({
      colorMode,
      themeTagName,
      jsDependencyPaths,
      publicPathMap,
      viteConfig: viteConfigData,
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
