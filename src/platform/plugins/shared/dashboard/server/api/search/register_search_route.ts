/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { getRouteConfig } from '../get_route_config';
import { searchRequestParamsSchema, searchResponseBodySchema } from './schemas';
import { search } from './search';

export function registerSearchRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(false);
  const searchRoute = router.get({
    path: `${basePath}`,
    summary: `Search dashboards`,
    ...routeConfig,
    description:
      'Returns a paginated list of dashboards. Each result includes title, description, tags, and metadata, but not the full panel layout. Use `GET /api/dashboards/{id}` to retrieve the complete state.',
  });

  searchRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          query: searchRequestParamsSchema,
        },
        response: {
          200: {
            body: () => searchResponseBodySchema,
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
        },
      },
    },
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          const result = await search(ctx, req.query);
          return res.ok({ body: result });
        } catch (e) {
          if (e.isBoom && e.output.statusCode === 403) {
            return res.forbidden({ body: { message: e.message } });
          }

          return res.badRequest({ body: { message: e.message } });
        }
      })
  );
}
