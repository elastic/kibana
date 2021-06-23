/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { PackageInfo } from '@kbn/config';
import { fromRoot } from '@kbn/utils';
import { distDir as uiSharedDepsDistDir } from '@kbn/ui-shared-deps';
import { IRouter } from '../../http';
import { UiPlugins } from '../../plugins';
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
  serverBasePath,
  uiPlugins,
  packageInfo,
}: {
  router: IRouter;
  serverBasePath: string;
  uiPlugins: UiPlugins;
  packageInfo: PackageInfo;
}) {
  const { dist: isDist, buildNum } = packageInfo;
  // rather than calculate the fileHash on every request, we
  // provide a cache object to `resolveDynamicAssetResponse()` that
  // will store the most recently used hashes.
  const fileHashCache = new FileHashCache();

  registerRouteForBundle(router, {
    publicPath: `${serverBasePath}/${buildNum}/bundles/kbn-ui-shared-deps/`,
    routePath: `/${buildNum}/bundles/kbn-ui-shared-deps/`,
    bundlesPath: uiSharedDepsDistDir,
    fileHashCache,
    isDist,
  });
  registerRouteForBundle(router, {
    publicPath: `${serverBasePath}/${buildNum}/bundles/core/`,
    routePath: `/${buildNum}/bundles/core/`,
    bundlesPath: fromRoot(join('src', 'core', 'target', 'public')),
    fileHashCache,
    isDist,
  });

  [...uiPlugins.internal.entries()].forEach(([id, { publicTargetDir, version }]) => {
    registerRouteForBundle(router, {
      publicPath: `${serverBasePath}/${buildNum}/bundles/plugin/${id}/${version}/`,
      routePath: `/${buildNum}/bundles/plugin/${id}/${version}/`,
      bundlesPath: publicTargetDir,
      fileHashCache,
      isDist,
    });
  });
}
