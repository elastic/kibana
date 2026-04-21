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
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { getRouteConfig } from '../get_route_config';
import { deleteDashboard } from './delete';
import { telemetryHandler } from '../telemetry_handler';

export function registerDeleteRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(false);
  const deleteRoute = router.delete({
    path: `${basePath}/{id}`,
    summary: `Delete a dashboard`,
    ...routeConfig,
    description: 'Permanently deletes a dashboard by ID.',
  });

  deleteRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'The dashboard ID, as returned by the create or search endpoints.',
              },
            }),
          }),
        },
        response: {
          200: {
            description: 'deleted',
          },
          403: {
            description: 'forbidden',
          },
          404: {
            description: 'not found',
          },
        },
      },
    },
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
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
      })
  );
}
