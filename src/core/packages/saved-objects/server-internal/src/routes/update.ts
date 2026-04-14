/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import type { SavedObjectsUpdateOptions } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
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
  deprecationInfo: RouteDeprecationInfo;
}

export const registerUpdateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;
  router.put(
    {
      path: '/{type}/{id}',
      options: {
        summary: `Update a saved object`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
        description: `Update the attributes for a Kibana saved object.

WARNING: This API is intended to be removed in a future Elastic Stack version.
Consider using the import API for your use case.`,
        oasOperationObject: () => path.resolve(__dirname, './update.examples.yaml'),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          version: schema.maybe(
            schema.string({
              meta: {
                description: 'The opaque version string used for optimistic concurrency control.',
              },
            })
          ),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              }),
              {
                maxSize: 1000,
                meta: {
                  description:
                    'The saved object references to persist alongside the updated attributes.',
                },
              }
            )
          ),
          upsert: schema.maybe(
            schema.recordOf(schema.string(), schema.any(), {
              meta: {
                description:
                  'If provided, creates the saved object with these attributes when it does not already exist.',
              },
            })
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'put',
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
