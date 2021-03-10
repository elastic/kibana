/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';

import * as UiSharedDeps from '@kbn/ui-shared-deps';
import { schema } from '@kbn/config-schema';
import { PackageInfo } from '@kbn/config';

import { fromRoot } from '../../utils';
import { IRouter } from '../../http';
import { UiPlugins } from '../../plugins';
import { createDynamicAssetHandler } from './dynamic_asset_response';
import { FileHashCache } from './file_hash_cache';

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
  serverBasePath, // serverBasePath
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
  // will store the 100 most recently used hashes.
  const fileHashCache = new FileHashCache();

  registerRouteForBundle(router, {
    publicPath: `${serverBasePath}/${buildNum}/bundles/kbn-ui-shared-deps/`,
    routePath: `/${buildNum}/bundles/kbn-ui-shared-deps/`,
    bundlesPath: UiSharedDeps.distDir,
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

  [...uiPlugins.internal.entries()].forEach(([id, { publicTargetDir }]) => {
    registerRouteForBundle(router, {
      publicPath: `${serverBasePath}/${buildNum}/bundles/plugin/${id}/`,
      routePath: `/${buildNum}/bundles/plugin/${id}/`,
      bundlesPath: publicTargetDir,
      fileHashCache,
      isDist,
    });
  });
}

function registerRouteForBundle(
  router: IRouter,
  {
    publicPath,
    routePath,
    bundlesPath,
    fileHashCache,
    isDist,
  }: {
    publicPath: string;
    routePath: string;
    bundlesPath: string;
    fileHashCache: FileHashCache;
    isDist: boolean;
  }
) {
  router.get(
    {
      path: `${routePath}{path*}`,
      options: {
        authRequired: false,
      },
      validate: {
        params: schema.object({
          path: schema.string(),
        }),
      },
    },
    createDynamicAssetHandler({
      publicPath,
      bundlesPath,
      isDist,
      fileHashCache,
    })
  );
}
