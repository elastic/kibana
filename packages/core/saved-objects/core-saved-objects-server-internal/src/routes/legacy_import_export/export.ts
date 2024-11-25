/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import type { InternalSavedObjectRouter } from '../../internal_types';
import { exportDashboards } from './lib';

export const registerLegacyExportRoute = (
  router: InternalSavedObjectRouter,
  {
    kibanaVersion,
    coreUsageData,
    logger,
    access,
    legacyDeprecationInfo,
  }: {
    kibanaVersion: string;
    coreUsageData: InternalCoreUsageDataSetup;
    logger: Logger;
    access: RouteAccess;
    legacyDeprecationInfo: RouteDeprecationInfo;
  }
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
        access,
        deprecated: legacyDeprecationInfo,
        tags: ['api'],
      },
    },
    async (context, request, response) => {
      logger.warn(
        "The export dashboard API '/api/kibana/dashboards/export' is deprecated. Use the saved objects export objects API '/api/saved_objects/_export' instead."
      );

      const ids = Array.isArray(request.query.dashboard)
        ? request.query.dashboard
        : [request.query.dashboard];
      const { client } = (await context.core).savedObjects;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementLegacyDashboardsExport({ request }).catch(() => {});

      const exported = await exportDashboards(ids, client, kibanaVersion);
      const filename = `kibana-dashboards.${moment.utc().format('YYYY-MM-DD-HH-mm-ss')}.json`;
      const body = JSON.stringify(exported, null, '  ');

      return response.ok({
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
