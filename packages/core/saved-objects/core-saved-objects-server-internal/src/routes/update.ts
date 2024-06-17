/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RouteAccess } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import type { SavedObjectsUpdateOptions } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
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

export const registerUpdateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.put(
    {
      path: '/{type}/{id}',
      options: {
        access,
        description: `Update a saved object`,
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          version: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
          upsert: schema.maybe(schema.recordOf(schema.string(), schema.any())),
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
      const { attributes, version, references, upsert } = request.body;
      const options: SavedObjectsUpdateOptions = {
        version,
        references,
        upsert,
        migrationVersionCompatibility: 'raw' as const,
      };

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsUpdate({ request, types: [type] }).catch(() => {});
      const { savedObjects } = await context.core;
      if (!allowHttpApiAccess) {
        throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);
      }
      const result = await savedObjects.client.update(type, id, attributes, options);
      return response.ok({ body: result });
    })
  );
};
