/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import type { InternalSavedObjectRouter } from '../../internal_types';
import { importDashboards } from './lib';

export const registerLegacyImportRoute = (
  router: InternalSavedObjectRouter,
  {
    maxImportPayloadBytes,
    coreUsageData,
    logger,
    access,
    legacyDeprecationInfo,
  }: {
    maxImportPayloadBytes: number;
    coreUsageData: InternalCoreUsageDataSetup;
    logger: Logger;
    access: RouteAccess;
    legacyDeprecationInfo: RouteDeprecationInfo;
  }
) => {
  router.post(
    {
      path: '/api/kibana/dashboards/import',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        body: schema.object({
          objects: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
          version: schema.maybe(schema.string()),
        }),
        query: schema.object({
          force: schema.boolean({ defaultValue: false }),
          exclude: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
        }),
      },
      options: {
        access,
        tags: ['api'],
        body: {
          maxBytes: maxImportPayloadBytes,
        },
        deprecated: legacyDeprecationInfo,
      },
    },
    async (context, request, response) => {
      logger.warn(
        "The import dashboard API '/api/kibana/dashboards/import' is deprecated. Use the saved objects import objects API '/api/saved_objects/_import' instead."
      );

      const { client } = (await context.core).savedObjects;
      const objects = request.body.objects as SavedObject[];
      const { force, exclude } = request.query;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementLegacyDashboardsImport({ request }).catch(() => {});

      const result = await importDashboards(client, objects, {
        overwrite: force,
        exclude: Array.isArray(exclude) ? exclude : [exclude],
      });
      return response.ok({
        body: result,
      });
    }
  );
};
