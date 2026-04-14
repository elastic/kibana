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
        description: `Create multiple Kibana saved objects.

WARNING: This API is intended to be removed in a future Elastic Stack version.
Consider using the import API for your use case.

NOTE: For forward compatibility, include \`coreMigrationVersion\` and \`typeMigrationVersion\` when creating saved objects outside of Kibana or when persisting raw saved objects outside of Kibana.`,
        oasOperationObject: () => path.resolve(__dirname, './bulk_create.examples.yaml'),
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
            meta: {
              description: 'When true, overwrites destination documents that already exist.',
            },
          }),
        }),
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.maybe(schema.string()),
            attributes: schema.recordOf(schema.string(), schema.any()),
            version: schema.maybe(schema.string()),
            migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
            coreMigrationVersion: schema.maybe(
              schema.string({
                meta: {
                  description:
                    'The Kibana version that last migrated this document. Preserve this field when creating saved objects outside of Kibana to retain forward compatibility.',
                },
              })
            ),
            typeMigrationVersion: schema.maybe(
              schema.string({
                meta: {
                  description:
                    'The saved object type version that last migrated this document. Preserve this field when creating saved objects outside of Kibana to retain forward compatibility.',
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
                { maxSize: 1000 }
              )
            ),
            initialNamespaces: schema.maybe(
              schema.arrayOf(schema.string(), {
                minSize: 1,
                maxSize: 100,
                meta: {
                  description:
                    'The spaces where the saved object should be created when the type supports multiple namespaces.',
                },
              })
            ),
          }),
          { maxSize: 10_000 }
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
