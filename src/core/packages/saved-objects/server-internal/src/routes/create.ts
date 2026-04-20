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

export const registerCreateRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const { allowHttpApiAccess } = config;

  const routeConfig = {
    options: {
      summary: `Create a saved object`,
      description:
        'WARNING: This API is deprecated. This is a legacy Saved Objects API and may be removed in a future version of Kibana.\n\nFor transferring or backing up saved objects, prefer the import and export APIs (`POST /api/saved_objects/_import` and `POST /api/saved_objects/_export`).',
      tags: ['oas-tag:saved objects'],
      access,
      deprecated: deprecationInfo,
      oasOperationObject: () => path.resolve(__dirname, './create.examples.yaml'),
    },
    security: {
      authz: {
        enabled: false,
        reason: 'This route delegates authorization to the Saved Objects Client',
      },
    },
    validate: {
      query: schema.object({
        overwrite: schema.boolean({
          defaultValue: false,
          meta: { description: 'Overwrite an existing saved object.' },
        }),
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
            }),
            { maxSize: 1000 }
          )
        ),
        initialNamespaces: schema.maybe(
          schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })
        ),
      }),
    },
  };

  const handler = catchAndReturnBoomErrors(async (context, request, response) => {
    logWarnOnExternalRequest({
      method: 'post',
      path: '/api/saved_objects/{type}/{id?}',
      request,
      logger,
    });
    const { type } = request.params;
    const id = 'id' in request.params ? request.params.id : undefined;
    const { overwrite } = request.query;
    const {
      attributes,
      migrationVersion,
      coreMigrationVersion,
      typeMigrationVersion,
      references,
      initialNamespaces,
    } = request.body;

    const usageStatsClient = coreUsageData.getClient();
    usageStatsClient.incrementSavedObjectsCreate({ request, types: [type] }).catch(() => {});

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
    return response.ok({ body: result });
  });

  router.post(
    {
      path: '/{type}',
      ...routeConfig,
      validate: {
        ...routeConfig.validate,
        params: schema.object({
          type: schema.string({ meta: { description: 'The saved object type.' } }),
        }),
      },
    },
    handler
  );

  router.post(
    {
      path: '/{type}/{id}',
      ...routeConfig,
      validate: {
        ...routeConfig.validate,
        params: schema.object({
          type: schema.string({ meta: { description: 'The saved object type.' } }),
          id: schema.string({ meta: { description: 'The saved object identifier.' } }),
        }),
      },
    },
    handler
  );
};
