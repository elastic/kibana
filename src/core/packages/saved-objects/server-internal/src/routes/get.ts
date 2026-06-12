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
  throwIfTypeNotVisibleByAPI,
} from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
  access: RouteAccess;
  deprecationInfo: RouteDeprecationInfo;
}

export const registerGetRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.get(
    {
      path: '/{type}/{id}',
      options: {
        summary: `Get a saved object`,
        description: `WARNING: This API is deprecated. This is a legacy Saved Objects API and may be removed in a future version of Kibana.

Retrieves a single Kibana saved object by type and ID.

For transferring or backing up saved objects, prefer the export API (\`POST /api/saved_objects/_export\`).`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
        oasOperationObject: () => path.resolve(__dirname, './get.examples.yaml'),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        params: schema.object({
          type: schema.string({ meta: { description: 'The saved object type.' } }),
          id: schema.string({ meta: { description: 'The saved object identifier.' } }),
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
