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
import { getRouteConfig } from '../get_route_config';
import { searchRequestParamsSchema, searchResponseBodySchema } from './schemas';
import { search } from './search';

export function registerSearchRoute(router: VersionedRouter<RequestHandlerContext>) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(false);
  const searchRoute = router.get({
    path: `${basePath}`,
    summary: `Search dashboards`,
    ...routeConfig,
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
            description: 'Indicates the search is successful and the dashboards are retrieved',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    async (ctx, req, res) => {
      let result;
      try {
        result = await search(ctx, req.query);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden({ body: { message: e.message } });
        }

        return res.badRequest({ body: { message: e.message } });
      }

      return res.ok({ body: result });
    }
  );
}
