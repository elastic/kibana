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
import { schema } from '@kbn/config-schema';
import { getRouteConfig } from '../get_route_config';
import { deleteDashboard } from './delete';

export function registerDeleteRoute(router: VersionedRouter<RequestHandlerContext>) {
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
        response: {
          200: {
            description: 'Indicates the dashboard is deleted successfully',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates that the dashboard with the given ID is not found.',
          },
        },
      },
    },
    async (ctx, req, res) => {
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
          return res.forbidden({ body: { message: e.message } });
        }
        return res.badRequest({ body: { message: e.message } });
      }

      return res.noContent();
    }
  );
}
