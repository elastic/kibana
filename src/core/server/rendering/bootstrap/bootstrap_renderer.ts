/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import * as UiSharedDeps from '@kbn/ui-shared-deps';
import { PackageInfo } from '@kbn/config';
import { UiPlugins } from '../../plugins';
import { IUiSettingsClient } from '../../ui_settings';
import { GetAuthState, KibanaRequest } from '../../http';
import { getStylesheetPaths } from './get_stylesheet_paths';
import { getPluginsBundlePaths } from './get_plugin_bundle_paths';
import { BootstrapTemplateInterpolator } from './render_template';

export type BootstrapRendererFactory = (factoryOptions: FactoryOptions) => BootstrapRenderer;
export type BootstrapRenderer = (options: RenderedOptions) => Promise<RendererResult>;

interface FactoryOptions {
  serverBasePath: string;
  packageInfo: PackageInfo;
  uiPlugins: UiPlugins;
  getAuthStatus: GetAuthState;
}

interface RenderedOptions {
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
}

interface RendererResult {
  body: string;
  etag: string;
}

export const bootstrapRendererFactory: BootstrapRendererFactory = ({
  packageInfo,
  serverBasePath,
  uiPlugins,
  getAuthStatus,
}) => {
  const templateInterpolator = new BootstrapTemplateInterpolator();

  return async ({ uiSettingsClient, request }) => {
    let darkMode: boolean;
    let themeVersion: string;

    try {
      const { status: authStatus } = getAuthStatus(request);
      const canUseSettings = authStatus !== 'unauthenticated'; // unknown is when auth is not present - oss
      darkMode = canUseSettings ? await uiSettingsClient.get('theme:darkMode') : false;
      themeVersion = canUseSettings ? await uiSettingsClient.get('theme:version') : 'v7';
    } catch (e) {
      // need to be resilient to ES connectivity issues
      darkMode = false;
      themeVersion = 'v7';
    }

    const themeTag = `${themeVersion === 'v7' ? 'v7' : 'v8'}${darkMode ? 'dark' : 'light'}`;
    const buildHash = packageInfo.buildNum;
    const basePath = serverBasePath;
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

    const body = await templateInterpolator.interpolate({
      themeTag,
      jsDependencyPaths,
      styleSheetPaths,
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
