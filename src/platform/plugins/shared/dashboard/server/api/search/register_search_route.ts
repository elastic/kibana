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
import { searchRequestBodySchema, searchResponseBodySchema } from './schemas';
import { search } from './search';
import type { DashboardApiRequestHandlerContext } from '../../request_handler_context';

export function registerSearchRoute(router: VersionedRouter<DashboardApiRequestHandlerContext>) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(false);
  const searchRoute = router.post({
    path: `${basePath}/search`,
    summary: `Search dashboards`,
    ...routeConfig,
  });

  searchRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          body: searchRequestBodySchema,
        },
        response: {
          200: {
            body: () => searchResponseBodySchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      let result;
      const { dashboardApi } = await ctx.resolve(['dashboardApi']);
      try {
        result = await search(ctx, req.body);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          const response = res.forbidden();
          dashboardApi.telemetry.incrementExternal(response);
          return response;
        }

        const response = res.badRequest();
        dashboardApi.telemetry.incrementExternal(response);
        return response;
      }

      const response = res.ok({ body: result });
      dashboardApi.telemetry.incrementExternal(response);
      return response;
    }
  );
}
