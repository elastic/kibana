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

import { isAbsolute, extname } from 'path';
import LruCache from 'lru-cache';
import * as UiSharedDeps from '@kbn/ui-shared-deps';
import { createDynamicAssetResponse } from './dynamic_asset_response';

/**
 *  Creates the routes that serves files from `bundlesPath` or from
 *  `dllBundlesPath` (if they are dll bundle's related files). If the
 *  file is js or css then it is searched for instances of
 *  PUBLIC_PATH_PLACEHOLDER and replaces them with `publicPath`.
 *
 *  @param {Object} options
 *  @property {string} options.regularBundlesPath
 *  @property {string} options.dllBundlesPath
 *  @property {string} options.basePublicPath
 *
 *  @return Array.of({Hapi.Route})
 */
export function createBundlesRoute({
  regularBundlesPath,
  dllBundlesPath,
  basePublicPath,
  builtCssPath,
}) {
  // rather than calculate the fileHash on every request, we
  // provide a cache object to `createDynamicAssetResponse()` that
  // will store the 100 most recently used hashes.
  const fileHashCache = new LruCache(100);

  if (typeof regularBundlesPath !== 'string' || !isAbsolute(regularBundlesPath)) {
    throw new TypeError(
      'regularBundlesPath must be an absolute path to the directory containing the regular bundles'
    );
  }

  if (typeof dllBundlesPath !== 'string' || !isAbsolute(dllBundlesPath)) {
    throw new TypeError(
      'dllBundlesPath must be an absolute path to the directory containing the dll bundles'
    );
  }

  if (typeof basePublicPath !== 'string') {
    throw new TypeError('basePublicPath must be a string');
  }

  if (!basePublicPath.match(/(^$|^\/.*[^\/]$)/)) {
    throw new TypeError('basePublicPath must be empty OR start and not end with a /');
  }

  return [
    buildRouteForBundles(
      `${basePublicPath}/bundles/kbn-ui-shared-deps/`,
      '/bundles/kbn-ui-shared-deps/',
      UiSharedDeps.distDir,
      fileHashCache
    ),
    buildRouteForBundles(
      `${basePublicPath}/bundles/`,
      '/bundles/',
      regularBundlesPath,
      fileHashCache
    ),
    buildRouteForBundles(
      `${basePublicPath}/built_assets/dlls/`,
      '/built_assets/dlls/',
      dllBundlesPath,
      fileHashCache
    ),
    buildRouteForBundles(`${basePublicPath}/`, '/built_assets/css/', builtCssPath, fileHashCache),
  ];
}

function buildRouteForBundles(publicPath, routePath, bundlesPath, fileHashCache) {
  return {
    method: 'GET',
    path: `${routePath}{path*}`,
    config: {
      auth: false,
      ext: {
        onPreHandler: {
          method(request, h) {
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
