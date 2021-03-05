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
import { HttpAuth, KibanaRequest } from '../../http';
import { getPluginsBundlePaths } from './get_plugin_bundle_paths';
import { BootstrapTemplateInterpolator } from './template_interpolator';

export type BootstrapRendererFactory = (factoryOptions: FactoryOptions) => BootstrapRenderer;
export type BootstrapRenderer = (options: RenderedOptions) => Promise<RendererResult>;

interface FactoryOptions {
  serverBasePath: string;
  packageInfo: PackageInfo;
  uiPlugins: UiPlugins;
  auth: HttpAuth;
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
  auth,
}) => {
  const templateInterpolator = new BootstrapTemplateInterpolator();

  const isAuthenticated = (request: KibanaRequest) => {
    if (!auth.isEnabled()) {
      return true;
    }
    const { status: authStatus } = auth.get(request);
    // status is 'unknown' when auth is disabled. we just need to not be `unauthenticated` here.
    return authStatus !== 'unauthenticated';
  };

  return async function bootstrapRenderer({ uiSettingsClient, request }) {
    let darkMode = false;
    let themeVersion = 'v7';

    try {
      const authenticated = isAuthenticated(request);
      darkMode = authenticated ? await uiSettingsClient.get('theme:darkMode') : false;
      themeVersion = authenticated ? await uiSettingsClient.get('theme:version') : 'v7';
    } catch (e) {
      // just use the default values in case of connectivity issues with ES
    }

    const themeTag = `${themeVersion === 'v7' ? 'v7' : 'v8'}${darkMode ? 'dark' : 'light'}`;
    const buildHash = packageInfo.buildNum;
    const regularBundlePath = `${serverBasePath}/${buildHash}/bundles`;

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
