/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { Logger } from '@kbn/logging';
import type {
  InternalSavedObjectRouter,
  InternalSavedObjectsRequestHandlerContext,
} from '../internal_types';
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

  const createQuerySchema = schema.object({
    overwrite: schema.boolean({
      defaultValue: false,
      meta: { description: 'Overwrite an existing saved object.' },
    }),
  });

  const createBodySchema = schema.object({
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
    initialNamespaces: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })),
  });

  type CreateBody = TypeOf<typeof createBodySchema>;

  const routeOptions = {
    summary: `Create a saved object`,
    description: `WARNING: This API is deprecated. This is a legacy Saved Objects API and may be removed in a future version of Kibana.

Creates a Kibana saved object; if an ID is provided it is used, otherwise Kibana generates one.

For transferring or backing up saved objects, prefer the import and export APIs (\`POST /api/saved_objects/_import\` and \`POST /api/saved_objects/_export\`).`,
    tags: ['oas-tag:saved objects'],
    access,
    deprecated: deprecationInfo,
    oasOperationObject: () => path.resolve(__dirname, './create.examples.yaml'),
  };

  const security = {
    authz: {
      enabled: false as const,
      reason: 'This route delegates authorization to the Saved Objects Client',
    },
  };

  const validateBase = {
    query: createQuerySchema,
    body: createBodySchema,
  };

  const executeCreate = async (
    context: InternalSavedObjectsRequestHandlerContext,
    request: KibanaRequest,
    type: string,
    id: string | undefined,
    overwrite: boolean,
    body: CreateBody
  ) => {
    const usageStatsClient = coreUsageData.getClient();
    usageStatsClient.incrementSavedObjectsCreate({ request, types: [type] }).catch(() => {});

    const { savedObjects } = await context.core;
    if (!allowHttpApiAccess) {
      throwIfTypeNotVisibleByAPI(type, savedObjects.typeRegistry);
    }
    const {
      attributes,
      migrationVersion,
      coreMigrationVersion,
      typeMigrationVersion,
      references,
      initialNamespaces,
    } = body;
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
    return savedObjects.client.create(type, attributes, options);
  };

  router.post(
    {
      path: '/{type}',
      options: routeOptions,
      security,
      validate: {
        ...validateBase,
        params: schema.object({
          type: schema.string({ meta: { description: 'The saved object type.' } }),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'post',
        path: '/api/saved_objects/{type}/{id?}',
        request,
        logger,
      });
      const { type } = request.params;
      const { overwrite } = request.query;
      const result = await executeCreate(
        context,
        request,
        type,
        undefined,
        overwrite,
        request.body
      );
      return response.ok({ body: result });
    })
  );

  router.post(
    {
      path: '/{type}/{id}',
      options: routeOptions,
      security,
      validate: {
        ...validateBase,
        params: schema.object({
          type: schema.string({ meta: { description: 'The saved object type.' } }),
          id: schema.string({ meta: { description: 'The saved object identifier.' } }),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'post',
        path: '/api/saved_objects/{type}/{id?}',
        request,
        logger,
      });
      const { type, id } = request.params;
      const { overwrite } = request.query;
      const result = await executeCreate(context, request, type, id, overwrite, request.body);
      return response.ok({ body: result });
    })
  );
};
