/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, SavedObject } from 'src/core/server';
import { importDashboards } from '../lib';

export const registerImportRoute = (router: IRouter, maxImportPayloadBytes: number) => {
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
      const { client } = ctx.core.savedObjects;
      const objects = req.body.objects as SavedObject[];
      const { force, exclude } = req.query;
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
