/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
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
  deprecationInfo: RouteDeprecationInfo;
}

export const registerBulkCreateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.post(
    {
      path: '/_bulk_create',
      options: {
        summary: `Create saved objects`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
      },
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
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'post',
        path: '/api/saved_objects/_bulk_create',
        request,
        logger,
      });
      const { overwrite } = request.query;
      const types = [...new Set(request.body.map(({ type }) => type))];

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkCreate({ request, types }).catch(() => {});

      const { savedObjects } = await context.core;

      if (!allowHttpApiAccess) {
        throwIfAnyTypeNotVisibleByAPI(types, savedObjects.typeRegistry);
      }

      const result = await savedObjects.client.bulkCreate(request.body, {
        overwrite,
        migrationVersionCompatibility: 'compatible',
      });
      return response.ok({ body: result });
    })
  );
};
