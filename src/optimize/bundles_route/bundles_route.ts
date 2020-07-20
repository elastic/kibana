/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { isAbsolute, extname, join } from 'path';

import Hapi from 'hapi';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

import { createDynamicAssetResponse } from './dynamic_asset_response';
import { FileHashCache } from './file_hash_cache';
import { assertIsNpUiPluginPublicDirs, NpUiPluginPublicDirs } from '../np_ui_plugin_public_dirs';
import { fromRoot } from '../../core/server/utils';

/**
 *  Creates the routes that serves files from `bundlesPath`. If the
 *  file is js or css then it is searched for instances of
 *  PUBLIC_PATH_PLACEHOLDER and replaces them with `publicPath`.
 *
 *  @param {Object} options
 *  @property {Array<{id,path}>} options.npUiPluginPublicDirs array of ids and paths that should be served for new platform plugins
 *  @property {string} options.regularBundlesPath
 *  @property {string} options.basePublicPath
 *
 *  @return Array.of({Hapi.Route})
 */
export function createBundlesRoute({
  regularBundlesPath,
  basePublicPath,
  builtCssPath,
  npUiPluginPublicDirs = [],
  buildHash,
  isDist = false,
}: {
  regularBundlesPath: string;
  basePublicPath: string;
  builtCssPath: string;
  npUiPluginPublicDirs?: NpUiPluginPublicDirs;
  buildHash: string;
  isDist?: boolean;
}) {
  // rather than calculate the fileHash on every request, we
  // provide a cache object to `resolveDynamicAssetResponse()` that
  // will store the 100 most recently used hashes.
  const fileHashCache = new FileHashCache();
  assertIsNpUiPluginPublicDirs(npUiPluginPublicDirs);

  if (typeof regularBundlesPath !== 'string' || !isAbsolute(regularBundlesPath)) {
    throw new TypeError(
      'regularBundlesPath must be an absolute path to the directory containing the regular bundles'
    );
  }

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
      replacePublicPath: false,
      isDist,
    }),
    ...npUiPluginPublicDirs.map(({ id, path }) =>
      buildRouteForBundles({
        publicPath: `${basePublicPath}/${buildHash}/bundles/plugin/${id}/`,
        routePath: `/${buildHash}/bundles/plugin/${id}/`,
        bundlesPath: path,
        fileHashCache,
        replacePublicPath: false,
        isDist,
      })
    ),
    buildRouteForBundles({
      publicPath: `${basePublicPath}/${buildHash}/bundles/core/`,
      routePath: `/${buildHash}/bundles/core/`,
      bundlesPath: fromRoot(join('src', 'core', 'target', 'public')),
      fileHashCache,
      replacePublicPath: false,
      isDist,
    }),
    buildRouteForBundles({
      publicPath: `${basePublicPath}/${buildHash}/bundles/`,
      routePath: `/${buildHash}/bundles/`,
      bundlesPath: regularBundlesPath,
      fileHashCache,
      isDist,
    }),
    buildRouteForBundles({
      publicPath: `${basePublicPath}/`,
      routePath: `/${buildHash}/built_assets/css/`,
      bundlesPath: builtCssPath,
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
  replacePublicPath = true,
  isDist,
}: {
  publicPath: string;
  routePath: string;
  bundlesPath: string;
  fileHashCache: FileHashCache;
  replacePublicPath?: boolean;
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
              replacePublicPath,
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
