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
import { getRouteConfig } from '../get_route_config';
import { deleteDashboard } from './delete';
import { counterNames } from '../telemetry/increment_external_counter';
import type { DashboardApiRequestHandlerContext } from '../../request_handler_context';

export function registerDeleteRoute(router: VersionedRouter<DashboardApiRequestHandlerContext>) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(false);
  const deleteRoute = router.delete({
    path: `${basePath}/{id}`,
    summary: `Delete a dashboard`,
    ...routeConfig,
  });

  deleteRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
        },
      },
    },
    async (ctx, req, res) => {
      const { dashboardApi } = await ctx.resolve(['dashboardApi']);
      dashboardApi.telemetry.incrementExternal(counterNames.external('delete'));
      try {
        await deleteDashboard(ctx, req.params.id);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A dashboard with ID [${req.params.id}] was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }
        return res.badRequest();
      }

      return res.ok();
    }
  );
}
