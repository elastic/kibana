/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { InternalCoreUsageDataSetup } from 'src/core/server/core_usage_data';
import { IRouter, Logger } from '../../..';
import { exportDashboards } from './lib';

export const registerLegacyExportRoute = (
  router: IRouter,
  {
    kibanaVersion,
    coreUsageData,
    logger,
  }: { kibanaVersion: string; coreUsageData: InternalCoreUsageDataSetup; logger: Logger }
) => {
  router.get(
    {
      path: '/api/kibana/dashboards/export',
      validate: {
        query: schema.object({
          dashboard: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
        }),
      },
      options: {
        tags: ['api'],
      },
    },
    async (ctx, req, res) => {
      logger.warn(
        "The export dashboard API '/api/kibana/dashboards/export' is deprecated. Use the saved objects export objects API '/api/saved_objects/_export' instead."
      );

      const ids = Array.isArray(req.query.dashboard) ? req.query.dashboard : [req.query.dashboard];
      const { client } = (await ctx.core).savedObjects;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementLegacyDashboardsExport({ request: req }).catch(() => {});

      const exported = await exportDashboards(ids, client, kibanaVersion);
      const filename = `kibana-dashboards.${moment.utc().format('YYYY-MM-DD-HH-mm-ss')}.json`;
      const body = JSON.stringify(exported, null, '  ');

      return res.ok({
        body,
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': 'application/json',
          'Content-Length': `${Buffer.byteLength(body, 'utf8')}`,
        },
      });
    }
  );
};
