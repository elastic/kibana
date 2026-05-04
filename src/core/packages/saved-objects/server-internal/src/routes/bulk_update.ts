/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
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

export const registerBulkUpdateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.put(
    {
      path: '/_bulk_update',
      options: {
        summary: `Update saved objects`,
        description: `WARNING: This API is deprecated. This is a legacy Saved Objects API and may be removed in a future version of Kibana.

Updates multiple Kibana saved objects in a single request.

For transferring or backing up saved objects, prefer the import and export APIs (\`POST /api/saved_objects/_import\` and \`POST /api/saved_objects/_export\`).`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
        oasOperationObject: () => path.resolve(__dirname, './bulk_update.examples.yaml'),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
            attributes: schema.recordOf(schema.string(), schema.any()),
            version: schema.maybe(schema.string()),
            references: schema.maybe(
              schema.arrayOf(
                schema.object({
                  name: schema.string(),
                  type: schema.string(),
                  id: schema.string(),
                }),
                { maxSize: 1000 }
              )
            ),
            namespace: schema.maybe(schema.string({ minLength: 1 })),
          }),
          { maxSize: 10_000 }
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'put',
        path: '/api/saved_objects/_bulk_update',
        request,
        logger,
      });
      const types = [...new Set(request.body.map(({ type }) => type))];

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkUpdate({ request, types }).catch(() => {});

      const { savedObjects } = await context.core;

      if (!allowHttpApiAccess) {
        throwIfAnyTypeNotVisibleByAPI(types, savedObjects.typeRegistry);
      }
      const savedObject = await savedObjects.client.bulkUpdate(request.body);
      return response.ok({ body: savedObject });
    })
  );
};
