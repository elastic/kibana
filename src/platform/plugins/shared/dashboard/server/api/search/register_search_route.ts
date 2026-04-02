/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import { getRouteConfig } from '../get_route_config';
import { searchRequestParamsSchema, searchResponseBodySchema } from './schemas';
import { search } from './search';
import type { DashboardApiRequestHandlerContext } from '../request_handler_context';

export function registerSearchRoute(router: VersionedRouter<DashboardApiRequestHandlerContext>) {
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
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
        },
      },
    },
    async (ctx, req, res) => {
      let result;
      const { dashboardApi } = await ctx.resolve(['dashboardApi']);
      const telemetry = dashboardApi.getTelemetryClient();
      try {
        result = await search(ctx, req.query);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          const response = res.forbidden({ body: { message: e.message } });
          telemetry?.incrementCounter(response);
          return response;
        }

        const response = res.badRequest({ body: { message: e.message } });
        telemetry?.incrementCounter(response);
        return response;
      }

      const response = res.ok({ body: result });
      telemetry?.incrementCounter(response);
      return response;
    }
  );
}
