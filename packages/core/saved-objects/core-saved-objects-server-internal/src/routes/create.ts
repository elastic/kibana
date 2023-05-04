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

export const registerCreateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.post(
    {
      path: '/{type}/{id?}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          coreMigrationVersion: schema.maybe(schema.string()),
          typeMigrationVersion: schema.maybe(schema.string()),
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
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      logWarnOnExternalRequest({
        method: 'post',
        path: '/api/saved_objects/{type}/{id?}',
        req,
        logger,
      });
      const { type, id } = req.params;
      const { overwrite } = req.query;
      const {
        attributes,
        migrationVersion,
        coreMigrationVersion,
        typeMigrationVersion,
        references,
        initialNamespaces,
      } = req.body;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsCreate({ request: req }).catch(() => {});

      const { savedObjects } = await context.core;
      if (!allowHttpApiAccess) {
        throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);
      }
      const options = {
        id,
        overwrite,
        migrationVersion,
        coreMigrationVersion,
        typeMigrationVersion,
        references,
        initialNamespaces,
        migrationVersionCompatibility: 'compatible' as const,
      };
      const result = await savedObjects.client.create(type, attributes, options);
      return res.ok({ body: result });
    })
  );
};
