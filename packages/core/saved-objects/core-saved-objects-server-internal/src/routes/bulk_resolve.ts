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
  throwIfAnyTypeNotVisibleByAPI,
} from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
  access: RouteAccess;
}

export const registerBulkResolveRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.post(
    {
      path: '/_bulk_resolve',
      options: {
        access,
        description: `Resolve saved objects`,
      },
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'post',
        path: '/api/saved_objects/_bulk_resolve',
        request,
        logger,
      });
      const types = [...new Set(request.body.map(({ type }) => type))];

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkResolve({ request, types }).catch(() => {});

      const { savedObjects } = await context.core;
      if (!allowHttpApiAccess) {
        throwIfAnyTypeNotVisibleByAPI(types, savedObjects.typeRegistry);
      }
      const result = await savedObjects.client.bulkResolve(request.body, {
        migrationVersionCompatibility: 'compatible',
      });
      return response.ok({ body: result });
    })
  );
};
