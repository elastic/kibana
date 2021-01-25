/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      const queryString = req.query.expand_wildcards
        ? { expand_wildcards: req.query.expand_wildcards }
        : null;
      const result = await context.core.elasticsearch.legacy.client.callAsCurrentUser(
        'transport.request',
        {
          method: 'GET',
          path: `/_resolve/index/${encodeURIComponent(req.params.query)}${
            queryString ? '?' + new URLSearchParams(queryString).toString() : ''
          }`,
        }
      );
      return res.ok({ body: result });
    }
  );
}
