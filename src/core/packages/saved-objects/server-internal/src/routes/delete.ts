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

export const registerDeleteRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.delete(
    {
      path: '/{type}/{id}',
      options: {
        summary: `Delete a saved object`,
        description: `WARNING: This API is deprecated. This is a legacy Saved Objects API and may be removed in a future version of Kibana.

Deletes a single Kibana saved object by type and ID.

There is currently no complete replacement for deleting arbitrary saved objects via an HTTP API.`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
        oasOperationObject: () => path.resolve(__dirname, './delete.examples.yaml'),
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
        query: schema.object({
          force: schema.maybe(
            schema.boolean({
              meta: {
                description:
                  'When true, force deletion of multi-namespace objects from all namespaces.',
              },
            })
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'delete',
        path: '/api/saved_objects/{type}/{id}',
        request,
        logger,
      });
      const { type, id } = request.params;
      const { force } = request.query;
      const { getClient, typeRegistry } = (await context.core).savedObjects;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsDelete({ request, types: [type] }).catch(() => {});
      if (!allowHttpApiAccess) {
        throwIfTypeNotVisibleByAPI(type, typeRegistry);
      }
      const client = getClient();
      const result = await client.delete(type, id, { force });
      return response.ok({ body: result });
    })
  );
};
