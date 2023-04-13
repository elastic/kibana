/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { InternalSavedObjectRouter } from '../internal_types';
import {
  catchAndReturnBoomErrors,
  logWarnOnExternalRequest,
  throwIfTypeNotVisibleByAPI,
} from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}

export const registerGetRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.get(
    {
      path: '/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      logWarnOnExternalRequest({
        method: 'get',
        path: '/api/saved_objects/{type}/{id}',
        req,
        logger,
      });
      const { type, id } = req.params;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsGet({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;

      if (!allowHttpApiAccess) {
        throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);
      }

      const object = await savedObjects.client.get(type, id, {
        migrationVersionCompatibility: 'compatible',
      });
      return res.ok({ body: object });
    })
  );
};
