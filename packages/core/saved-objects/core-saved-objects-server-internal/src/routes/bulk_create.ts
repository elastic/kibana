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
import { catchAndReturnBoomErrors, throwIfAnyTypeNotVisibleByAPI } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}

export const registerBulkCreateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.post(
    {
      path: '/_bulk_create',
      validate: {
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.maybe(schema.string()),
            attributes: schema.recordOf(schema.string(), schema.any()),
            version: schema.maybe(schema.string()),
            migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
            coreMigrationVersion: schema.maybe(schema.string()),
            references: schema.maybe(
              schema.arrayOf(
                schema.object({
                  name: schema.string(),
                  type: schema.string(),
                  id: schema.string(),
                })
              )
            ),
            initialNamespaces: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      logger.warn(
        "The bulk create saved object API '/api/saved_objects/_bulk_create' is deprecated."
      );
      const { overwrite } = req.query;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkCreate({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;

      const typesToCheck = [...new Set(req.body.map(({ type }) => type))];
      if (!allowHttpApiAccess) {
        throwIfAnyTypeNotVisibleByAPI(typesToCheck, savedObjects.typeRegistry);
      }
      const result = await savedObjects.client.bulkCreate(req.body, { overwrite });
      return res.ok({ body: result });
    })
  );
};
