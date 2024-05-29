/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { RouteAccess } from '@kbn/core-http-server';
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
  access: RouteAccess;
}

export const registerGetRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.get(
    {
      path: '/{type}/{id}',
      options: {
        access,
        description: `Get a saved object`,
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'get',
        path: '/api/saved_objects/{type}/{id}',
        request,
        logger,
      });
      const { type, id } = request.params;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsGet({ request, types: [type] }).catch(() => {});

      const { savedObjects } = await context.core;

      if (!allowHttpApiAccess) {
        throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);
      }

      const object = await savedObjects.client.get(type, id, {
        migrationVersionCompatibility: 'compatible',
      });
      return response.ok({ body: object });
    })
  );
};
