/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import { once } from 'lodash';
import { getRouteConfig } from '../get_route_config';
import { getReadResponseBodySchema } from './schemas';
import { read } from './read';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardApiRequestHandlerContext } from '../request_handler_context';

export function registerReadRoute(
  router: VersionedRouter<DashboardApiRequestHandlerContext>,
  isDashboardAppRequest: boolean
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(isDashboardAppRequest);
  const readRoute = router.get({
    path: `${basePath}/{id}`,
    summary: `Get a dashboard`,
    ...routeConfig,
  });

  // Do not call getDashboardStateSchema when registering route.
  // Route is registered during setup and before all plugins have registered embeddable schemas.
  // Instead, use once to only call getDashboardStateSchema the first time a route handler is executed.
  const getCachedDashboardStateSchema = once(() => {
    return getDashboardStateSchema(isDashboardAppRequest);
  });

  readRoute.addVersion(
    {
      version: routeVersion,
      validate: () => ({
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
        },
        response: {
          200: {
            body: () => getReadResponseBodySchema(isDashboardAppRequest),
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
          404: {
            description: 'not found',
          },
        },
      }),
    },
    async (ctx, req, res) => {
      const { dashboardApi } = await ctx.resolve(['dashboardApi']);
      const telemetry = dashboardApi.getTelemetryClient();
      try {
        const { body, resolveHeaders } = await read(
          ctx,
          getCachedDashboardStateSchema(),
          req.params.id,
          isDashboardAppRequest
        );
        const response = res.ok({
          body,
          ...(isDashboardAppRequest && { headers: resolveHeaders }),
        });
        telemetry?.incrementCounter(response);
        return response;
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          const response = res.notFound({
            body: {
              message: `A dashboard with ID [${req.params.id}] was not found.`,
            },
          });
          telemetry?.incrementCounter(response);
          return response;
        }

        if (e.isBoom && e.output.statusCode === 403) {
          const response = res.forbidden({ body: { message: e.message } });
          telemetry?.incrementCounter(response);
          return response;
        }

        const response = res.badRequest({ body: { message: e.message } });
        telemetry?.incrementCounter(response);
        return response;
      }
    }
  );
}
