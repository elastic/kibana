/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';

export function registerResolveIndexRoute(router: IRouter): void {
  router.get(
    {
      path: '/internal/index-pattern-management/resolve_index/{query}',
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization provided by Elasticsearch',
        },
      },
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
          project_routing: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const esClient = (await context.core).elasticsearch.client;
      try {
        const params = {
          name: req.params.query,
          expand_wildcards: req.query.expand_wildcards || 'open',
          // TODO: we should be sending this param here and esClient should pass it to body but it is not yet supported in esClient
          // ...(req.query.project_routing ? { project_routing: req.query.project_routing } : {}),
          // so we do this for now:
          ...(req.query.project_routing
            ? { body: { project_routing: req.query.project_routing } }
            : {}),
        };

        // @ts-ignore because the types for resolveIndex do not yet include body param
        const body = await esClient.asCurrentUser.indices.resolveIndex(params);
        return res.ok({ body });
      } catch (e) {
        // 403: no_such_remote_cluster_exception
        // 404: index_not_found_exception
        if ([403, 404].includes(e?.meta.statusCode)) {
          return res.notFound({ body: { message: e.meta?.body?.error?.reason } });
        } else {
          throw getKbnServerError(e);
        }
      }
    }
  );
}
