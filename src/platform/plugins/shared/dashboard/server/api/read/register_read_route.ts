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
import { getReadResponseBodySchema } from './schemas';
import { read } from './read';
import { stripUnmappedKeys } from '../scope_tooling';
import { counterNames } from '../telemetry/increment_external_counter';
import type { DashboardApiRequestHandlerContext } from '../../request_handler_context';

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
          },
        },
      }),
    },
    async (ctx, req, res) => {
      const { dashboardApi } = await ctx.resolve(['dashboardApi']);
      dashboardApi.telemetry.incrementExternal(counterNames.external('read'));
      try {
        const result = await read(ctx, req.params.id);
        const { data, warnings, droppedPanels } = !isDashboardAppRequest
          ? stripUnmappedKeys(result.data)
          : { data: result.data, warnings: [], droppedPanels: { total: 0, byType: {} } };

        if (!isDashboardAppRequest && droppedPanels.total > 0) {
          dashboardApi.telemetry.incrementExternalByType({
            totalCounterName: counterNames.externalReadStrippedPanelsTotal(),
            byTypeCounterName: counterNames.externalReadStrippedPanelsByType,
            byType: droppedPanels.byType,
          });
        }
        return res.ok({
          body: {
            ...result,
            data,
            meta: {
              ...result.meta,
              ...(droppedPanels.total > 0 && {
                dropped_panels: {
                  total: droppedPanels.total,
                  by_type: droppedPanels.byType,
                },
              }),
            },
            ...(warnings?.length && { warnings }),
          },
        });
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

        return res.badRequest(e.message);
      }
    }
  );
}
