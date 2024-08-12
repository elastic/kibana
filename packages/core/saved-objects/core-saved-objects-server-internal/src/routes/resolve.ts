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
import { throwIfTypeNotVisibleByAPI, logWarnOnExternalRequest } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
  access: RouteAccess;
}

export const registerResolveRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.get(
    {
      path: '/resolve/{type}/{id}',
      options: {
        summary: `Resolve a saved object`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: true,
        description: `Retrieve a single Kibana saved object by ID, using any legacy URL alias if it exists.
        Under certain circumstances, when Kibana is upgraded, saved object migrations may necessitate regenerating some object IDs to enable new features. When an object's ID is regenerated, a legacy URL alias is created for that object, preserving its old ID. In such a scenario, that object can be retrieved with the resolve API using either its new ID or its old ID.`,
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'get',
        path: '/api/saved_objects/resolve/{type}/{id}',
        request,
        logger,
      });
      const { type, id } = request.params;
      const { savedObjects } = await context.core;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsResolve({ request, types: [type] }).catch(() => {});
      if (!allowHttpApiAccess) {
        throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);
      }
      const result = await savedObjects.client.resolve(type, id, {
        migrationVersionCompatibility: 'compatible',
      });
      return response.ok({ body: result });
    })
  );
};
