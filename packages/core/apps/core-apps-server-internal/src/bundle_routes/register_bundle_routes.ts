/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PackageInfo } from '@kbn/config';
import { fromRoot } from '@kbn/repo-info';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import { distDir as UiSharedDepsSrcDistDir } from '@kbn/ui-shared-deps-src';
import * as KbnMonaco from '@kbn/monaco/server';
import type { IRouter } from '@kbn/core-http-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { InternalStaticAssets } from '@kbn/core-http-server-internal';
import { FileHashCache } from './file_hash_cache';
import { registerRouteForBundle } from './bundles_route';

/**
 *  Creates the routes that serves files from `bundlesPath`.
 *
 *  @param {Object} options
 *  @property {Array<{id,path}>} options.npUiPluginPublicDirs array of ids and paths that should be served for new platform plugins
 *  @property {string} options.regularBundlesPath
 *  @property {string} options.basePublicPath
 *
 *  @return Array.of({Hapi.Route})
 */
export function registerBundleRoutes({
  router,
  uiPlugins,
  packageInfo,
  staticAssets,
}: {
  router: IRouter;
  uiPlugins: UiPlugins;
  packageInfo: PackageInfo;
  staticAssets: InternalStaticAssets;
}) {
  const { dist: isDist } = packageInfo;
  // rather than calculate the fileHash on every request, we
  // provide a cache object to `resolveDynamicAssetResponse()` that
  // will store the most recently used hashes.
  const fileHashCache = new FileHashCache();

  const sharedNpmDepsPath = '/bundles/kbn-ui-shared-deps-npm/';
  registerRouteForBundle(router, {
    publicPath: staticAssets.prependPublicUrl(sharedNpmDepsPath) + '/',
    routePath: staticAssets.prependServerPath(sharedNpmDepsPath) + '/',
    bundlesPath: UiSharedDepsNpm.distDir,
    fileHashCache,
    isDist,
  });
  const sharedDepsPath = '/bundles/kbn-ui-shared-deps-src/';
  registerRouteForBundle(router, {
    publicPath: staticAssets.prependPublicUrl(sharedDepsPath) + '/',
    routePath: staticAssets.prependServerPath(sharedDepsPath) + '/',
    bundlesPath: UiSharedDepsSrcDistDir,
    fileHashCache,
    isDist,
  });
  const coreBundlePath = '/bundles/core/';
  registerRouteForBundle(router, {
    publicPath: staticAssets.prependPublicUrl(coreBundlePath) + '/',
    routePath: staticAssets.prependServerPath(coreBundlePath) + '/',
    bundlesPath: isDist
      ? fromRoot('node_modules/@kbn/core/target/public')
      : fromRoot('src/core/target/public'),
    fileHashCache,
    isDist,
  });
  const monacoEditorPath = '/bundles/kbn-monaco/';
  registerRouteForBundle(router, {
    publicPath: staticAssets.prependPublicUrl(monacoEditorPath) + '/',
    routePath: staticAssets.prependServerPath(monacoEditorPath) + '/',
    bundlesPath: KbnMonaco.bundleDir,
    fileHashCache,
    isDist,
  });

  [...uiPlugins.internal.entries()].forEach(([id, { publicTargetDir, version }]) => {
    const pluginBundlesPath = `/bundles/plugin/${id}/${version}/`;
    registerRouteForBundle(router, {
      publicPath: staticAssets.prependPublicUrl(pluginBundlesPath) + '/',
      routePath: staticAssets.prependServerPath(pluginBundlesPath) + '/',
      bundlesPath: publicTargetDir,
      fileHashCache,
      isDist,
    });
  });
}
