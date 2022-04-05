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
  throwIfAnyTypeNotVisibleByAPI,
} from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}

export const registerBulkResolveRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.post(
    {
      path: '/_bulk_resolve',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      logWarnOnExternalRequest({
        method: 'post',
        path: '/api/saved_objects/_bulk_resolve',
        req,
        logger,
      });
      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkResolve({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;
      const typesToCheck = [...new Set(req.body.map(({ type }) => type))];
      if (!allowHttpApiAccess) {
        throwIfAnyTypeNotVisibleByAPI(typesToCheck, savedObjects.typeRegistry);
      }
      const result = await savedObjects.client.bulkResolve(req.body, {
        migrationVersionCompatibility: 'compatible',
      });
      return res.ok({ body: result });
    })
  );
};
