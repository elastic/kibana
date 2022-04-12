/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';

export function registerResolveIndexRoute(router: IRouter): void {
  router.get(
    {
      path: '/internal/index-pattern-management/resolve_index/{query}',
      validate: {
        params: schema.object({
          query: schema.string(),
        }),
        query: schema.object({
          expand_wildcards: schema.maybe(
            schema.oneOf([
              schema.literal('all'),
              schema.literal('open'),
              schema.literal('closed'),
              schema.literal('hidden'),
              schema.literal('none'),
            ])
          ),
        }),
      },
    },
    async (context, req, res) => {
      const esClient = (await context.core).elasticsearch.client;
      const body = await esClient.asCurrentUser.indices.resolveIndex({
        name: req.params.query,
        expand_wildcards: req.query.expand_wildcards || 'open',
      });
      return res.ok({ body });
    }
  );
}
