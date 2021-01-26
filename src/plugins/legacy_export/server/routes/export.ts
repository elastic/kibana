/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { exportDashboards } from '../lib';

export const registerExportRoute = (router: IRouter, kibanaVersion: string) => {
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
      const ids = Array.isArray(req.query.dashboard) ? req.query.dashboard : [req.query.dashboard];
      const { client } = ctx.core.savedObjects;

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
