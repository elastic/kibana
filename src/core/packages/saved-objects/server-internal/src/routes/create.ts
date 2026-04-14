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
  router.post(
    {
      path: '/{type}/{id?}',
      options: {
        summary: `Create a saved object`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
        description: `Create a Kibana saved object with either a caller-provided identifier or a randomly generated one.

WARNING: This API is intended to be removed in a future Elastic Stack version.
Consider using the import API for your use case.

NOTE: For forward compatibility, include \`coreMigrationVersion\` and \`typeMigrationVersion\` when creating saved objects outside of Kibana or when persisting raw saved objects outside of Kibana.`,
        oasOperationObject: () => path.resolve(__dirname, './create.examples.yaml'),
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
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({
            defaultValue: false,
            meta: {
              description: 'When true, overwrites the destination document if it already exists.',
            },
          }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
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
                  'The spaces where the object should be created when the saved object type supports multiple namespaces.',
              },
            })
          ),
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
    })
  );
};
