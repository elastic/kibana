/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, Logger, SavedObject } from '../../..';
import { InternalCoreUsageDataSetup } from '../../../core_usage_data';
import { importDashboards } from './lib';

export const registerLegacyImportRoute = (
  router: IRouter,
  {
    maxImportPayloadBytes,
    coreUsageData,
    logger,
  }: { maxImportPayloadBytes: number; coreUsageData: InternalCoreUsageDataSetup; logger: Logger }
) => {
  router.post(
    {
      path: '/api/kibana/dashboards/import',
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
        tags: ['api'],
        body: {
          maxBytes: maxImportPayloadBytes,
        },
      },
    },
    async (ctx, req, res) => {
      logger.warn(
        "The import dashboard API '/api/kibana/dashboards/import' is deprecated. Use the saved objects import objects API '/api/saved_objects/_import' instead."
      );

      const { client } = (await ctx.core).savedObjects;
      const objects = req.body.objects as SavedObject[];
      const { force, exclude } = req.query;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementLegacyDashboardsImport({ request: req }).catch(() => {});

      const result = await importDashboards(client, objects, {
        overwrite: force,
        exclude: Array.isArray(exclude) ? exclude : [exclude],
      });
      return res.ok({
        body: result,
      });
    }
  );
};
