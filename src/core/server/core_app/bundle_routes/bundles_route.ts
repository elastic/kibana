/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { schema } from '@kbn/config-schema';
import {
  InternalHttpServiceSetup,
  InternalHttpServicePreboot,
  RegisterStaticDirCacheOptions,
} from '../../http';
// import { createDynamicAssetHandler } from './dynamic_asset_response';
// import { FileHashCache } from './file_hash_cache';

const SEC = 1000;
const MINUTE = 60 * SEC;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function registerRouteForBundle(
  http: InternalHttpServiceSetup | InternalHttpServicePreboot,
  {
    // publicPath,
    routePath,
    bundlesPath,
    // fileHashCache,
    isDist,
  }: {
    // publicPath: string;
    routePath: string;
    bundlesPath: string;
    // fileHashCache: FileHashCache;
    isDist: boolean;
  }
) {
  const cache: RegisterStaticDirCacheOptions = isDist
    ? { expiresIn: 365 * DAY, otherwise: 'immutable', privacy: 'public' }
    : { otherwise: 'must-revalidate', privacy: 'public' };

  http.registerStaticDir(`${routePath}{path*}`, bundlesPath, {
    cache,
    etagMethod: isDist ? false : 'hash',
  });

  /**
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
   */
}
