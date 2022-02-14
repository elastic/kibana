/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';

export const registerHitsStatusRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/home/hits_status',
      validate: {
        body: schema.object({
          index: schema.string(),
          query: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { index, query } = req.body;
      const client = context.core.elasticsearch.client;

      try {
        const body = await client.asCurrentUser.search({
          index,
          size: 1,
          body: {
            query,
          },
        });
        const count = body.hits.hits.length;

        return res.ok({
          body: {
            count,
          },
        });
      } catch (e) {
        return res.badRequest({
          body: e,
        });
      }
    })
  );
};
