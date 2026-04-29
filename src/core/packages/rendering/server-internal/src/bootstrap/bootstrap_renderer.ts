/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { createHash } from 'crypto';
import type { BehaviorSubject } from 'rxjs';
import type { PackageInfo } from '@kbn/config';
import { fromRoot } from '@kbn/repo-info';
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
import { getJsDependencyPaths, getRspackDependencyPaths } from './get_js_dependency_paths';
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

/**
 * Check if RSPack mode is enabled via environment variable
 */
export function isRspackModeEnabled(): boolean {
  const v = process.env.KBN_USE_RSPACK;
  return v === 'true' || v === '1';
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

  const useRspack = isRspackModeEnabled();
  const useHMR = !packageInfo.dist && process.env.KBN_HMR !== 'false';
  const isDist = packageInfo.dist;

  // Read chunk-manifest.json to get all async chunk filenames for the load() array.
  // Cached in dist mode (chunks don't change at runtime). In dev mode, re-read each
  // request so HMR-triggered recompilations are picked up.
  let cachedAllChunkFilenames: string[] | null = null;
  const getAllChunkFilenames = (): string[] => {
    if (isDist && cachedAllChunkFilenames) {
      return cachedAllChunkFilenames;
    }
    try {
      const manifestPath = fromRoot('target/public/bundles/chunk-manifest.json');
      const raw = Fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw) as { allChunks?: string[] };
      const result = manifest.allChunks ?? [];
      if (isDist) {
        cachedAllChunkFilenames = result;
      }
      return result;
    } catch {
      return [];
    }
  };

  // Detect external plugins once at startup (not per-request).
  // External plugins live in the plugins/ directory and have standalone bundles
  // built by kbn-plugin-helpers. Only check that directory — internal plugins are
  // compiled into kibana.bundle.js and their directories may contain leftover
  // webpack bundles that must not be loaded separately.
  const externalPluginIds = new Set<string>();
  if (useRspack) {
    const externalPluginsDir = fromRoot('plugins') + Path.sep;
    for (const [pluginId, { publicTargetDir }] of uiPlugins.internal.entries()) {
      if (!publicTargetDir.startsWith(externalPluginsDir)) {
        continue;
      }
      const standaloneBundle = Path.join(publicTargetDir, `${pluginId}.plugin.js`);
      if (Fs.existsSync(standaloneBundle)) {
        externalPluginIds.add(pluginId);
      }
    }
  }

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

    let body: string;

    if (useRspack) {
      // Build script paths for external plugins using the same route scheme as bundle routes
      const externalPluginScriptPaths = [...externalPluginIds].map((pluginId) => {
        const { version } = uiPlugins.internal.get(pluginId)!;
        return `${bundlesHref}/plugin/${pluginId}/${version}/${pluginId}.plugin.js`;
      });

      const chunkPaths = getAllChunkFilenames().map((f) => `${bundlesHref}/${f}`);

      const rspackPaths = getRspackDependencyPaths(
        bundlesHref,
        bundlePaths,
        externalPluginScriptPaths,
        chunkPaths
      );

      const bundlesDir = `${bundlesHref}/`;
      const publicPathMap = JSON.stringify({
        core: bundlesDir,
        'kbn-ui-shared-deps-src': `${bundlesHref}/kbn-ui-shared-deps-src/`,
        'kbn-ui-shared-deps-npm': `${bundlesHref}/kbn-ui-shared-deps-npm/`,
        'kbn-monaco': `${bundlesHref}/kbn-monaco/`,
        // Internal plugins use the unified bundles directory
        ...Object.fromEntries(
          [...bundlePaths.entries()]
            .filter(([pluginId]) => !externalPluginIds.has(pluginId))
            .map(([pluginId]) => [pluginId, bundlesDir])
        ),
        // External plugins use their own versioned bundle route
        ...Object.fromEntries(
          [...externalPluginIds].map((pluginId) => {
            const { version } = uiPlugins.internal.get(pluginId)!;
            return [pluginId, `${bundlesHref}/plugin/${pluginId}/${version}/`];
          })
        ),
      });

      body = renderTemplate({
        colorMode,
        themeTagName,
        jsDependencyPaths: rspackPaths,
        publicPathMap,
        useHMR,
        useRspack: true,
      });
    } else {
      // Legacy mode - use __kbnBundles__ with DLLs
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

      body = renderTemplate({
        colorMode,
        themeTagName,
        jsDependencyPaths,
        publicPathMap,
      });
    }

    const hash = createHash('sha256');
    hash.update(body);
    const etag = hash.digest('hex');

    return {
      body,
      etag,
    };
  };
};
