/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extname, join } from 'path';

import Hapi from '@hapi/hapi';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

import { createDynamicAssetResponse } from './dynamic_asset_response';
import { FileHashCache } from './file_hash_cache';
import { assertIsNpUiPluginPublicDirs, NpUiPluginPublicDirs } from '../np_ui_plugin_public_dirs';
import { fromRoot } from '../../core/server/utils';

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
export function createBundlesRoute({
  basePublicPath,
  npUiPluginPublicDirs = [],
  buildHash,
  isDist = false,
}: {
  basePublicPath: string;
  npUiPluginPublicDirs?: NpUiPluginPublicDirs;
  buildHash: string;
  isDist?: boolean;
}) {
  // rather than calculate the fileHash on every request, we
  // provide a cache object to `resolveDynamicAssetResponse()` that
  // will store the 100 most recently used hashes.
  const fileHashCache = new FileHashCache();
  assertIsNpUiPluginPublicDirs(npUiPluginPublicDirs);

  if (typeof basePublicPath !== 'string') {
    throw new TypeError('basePublicPath must be a string');
  }

  if (!basePublicPath.match(/(^$|^\/.*[^\/]$)/)) {
    throw new TypeError('basePublicPath must be empty OR start and not end with a /');
  }

  return [
    buildRouteForBundles({
      publicPath: `${basePublicPath}/${buildHash}/bundles/kbn-ui-shared-deps/`,
      routePath: `/${buildHash}/bundles/kbn-ui-shared-deps/`,
      bundlesPath: UiSharedDeps.distDir,
      fileHashCache,
      isDist,
    }),
    ...npUiPluginPublicDirs.map(({ id, path }) =>
      buildRouteForBundles({
        publicPath: `${basePublicPath}/${buildHash}/bundles/plugin/${id}/`,
        routePath: `/${buildHash}/bundles/plugin/${id}/`,
        bundlesPath: path,
        fileHashCache,
        isDist,
      })
    ),
    buildRouteForBundles({
      publicPath: `${basePublicPath}/${buildHash}/bundles/core/`,
      routePath: `/${buildHash}/bundles/core/`,
      bundlesPath: fromRoot(join('src', 'core', 'target', 'public')),
      fileHashCache,
      isDist,
    }),
  ];
}

function buildRouteForBundles({
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
}) {
  return {
    method: 'GET',
    path: `${routePath}{path*}`,
    config: {
      auth: false,
      ext: {
        onPreHandler: {
          method(request: Hapi.Request, h: Hapi.ResponseToolkit) {
            const ext = extname(request.params.path);

            if (ext !== '.js' && ext !== '.css') {
              return h.continue;
            }

            return createDynamicAssetResponse({
              request,
              h,
              bundlesPath,
              fileHashCache,
              publicPath,
              isDist,
            });
          },
        },
      },
    },
    handler: {
      directory: {
        path: bundlesPath,
        listing: false,
        lookupCompressed: true,
      },
    },
  };
}
