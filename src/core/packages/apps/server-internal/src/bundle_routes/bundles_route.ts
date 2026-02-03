/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core-http-server';
import { createDynamicAssetHandler } from './dynamic_asset_response';
import type { FileHashCache } from './file_hash_cache';
import { tryViteProxy } from './vite_proxy';

export interface BundleRouteOptions {
  publicPath: string;
  routePath: string;
  bundlesPath: string;
  fileHashCache: FileHashCache;
  isDist: boolean;
  /**
   * If provided, enables Vite proxy for this plugin bundle.
   * Requests will try Vite first, falling back to disk if Vite doesn't serve it.
   */
  pluginId?: string;
  /**
   * Plugin version (required when pluginId is provided)
   */
  pluginVersion?: string;
}

export function registerRouteForBundle(router: IRouter, options: BundleRouteOptions) {
  const { publicPath, routePath, bundlesPath, fileHashCache, isDist, pluginId, pluginVersion } =
    options;

  // Create the disk-based handler
  const diskHandler = createDynamicAssetHandler({
    publicPath,
    bundlesPath,
    isDist,
    fileHashCache,
  });

  // Create handler that tries Vite first for plugin bundles
  const handler: RequestHandler<{ path: string }, {}, {}> = async (ctx, req, res) => {
    // If this is a plugin bundle and Vite is available, try Vite first
    // Note: The route path already includes the version, so req.params.path is just the filename
    if (pluginId && pluginVersion && !isDist) {
      const filePath = req.params.path; // e.g., "timelines.plugin.js"

      try {
        const viteResult = await tryViteProxy(pluginId, pluginVersion, filePath);
        if (viteResult) {
          return res.ok({
            body: viteResult.body,
            headers: {
              'content-type': viteResult.contentType,
              'cache-control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      } catch (viteError) {
        // eslint-disable-next-line no-console
        console.error(`[vite-proxy] Error in tryViteProxy for ${pluginId}:`, viteError);
        // Continue to disk fallback
      }
    }

    // Fall back to disk-based handler
    return diskHandler(ctx, req, res);
  };

  router.get(
    {
      path: `${routePath}{path*}`,
      options: {
        httpResource: true,
        authRequired: false,
        access: 'public',
        excludeFromRateLimiter: true,
      },
      validate: {
        params: schema.object({
          path: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for serving assets and does not require authorization.',
        },
      },
    },
    handler
  );
}
