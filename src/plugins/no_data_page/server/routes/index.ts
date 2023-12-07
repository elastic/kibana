/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IRouter,
  Logger,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { NO_DATA_API_PATHS } from '../../common';
import type { HasApiKeysApiResponse } from '../../common/types';

interface GetHasApiKeysRoutePluginDeps {
  logger: Logger;
  security?: SecurityPluginStart;
}

/**
 * Register a internal route that informs the UI whether the currently logged-in user has created API keys in
 * Elasticsearch Security. This is used to direct users effectively through their getting started experience.
 *
 * NOTE: The user may not have the necessary privilege to call the required Elasticsearch API.
 * NOTE: The user may have created API keys that have been invalidated, which explicitly do not get counted the result.
 * NOTE: The Elasticsearch cluster may not have API keys enabled.
 */
export const getHasApiKeysRoute = (router: IRouter, deps: GetHasApiKeysRoutePluginDeps) => {
  const { logger, security } = deps;

  router.get(
    {
      path: NO_DATA_API_PATHS.internal.hasApiKeys,
      validate: {},
    },
    async function handler(
      _: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      let hasApiKeys: boolean | null = null;

      try {
        const result = await security?.authc.apiKeys.hasApiKeys(req, {
          ownerOnly: true,
          validOnly: true,
        });
        hasApiKeys = result ?? null;
      } catch (e) {
        logger.error(e);
      }

      return res.ok<HasApiKeysApiResponse>({
        body: {
          has_api_keys: hasApiKeys ?? false,
        },
      });
    }
  );
};
