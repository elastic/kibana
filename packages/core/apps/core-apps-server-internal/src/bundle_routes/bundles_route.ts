/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import { createDynamicAssetHandler } from './dynamic_asset_response';
import { FileHashCache } from './file_hash_cache';

export function registerRouteForBundle(
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
        access: 'public',
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
