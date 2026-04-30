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
import { schema } from '@kbn/config-schema';
import { once } from 'lodash';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { getRouteConfig } from '../get_route_config';
import { getReadResponseBodySchema } from './schemas';
import { read } from './read';
import { getDashboardStateSchema } from '../dashboard_state_schemas';

export function registerReadRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  isDashboardAppRequest: boolean
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(isDashboardAppRequest);
  const readRoute = router.get({
    path: `${basePath}/{id}`,
    summary: `Get a dashboard`,
    ...routeConfig,
    description: 'Returns the complete state of a dashboard by ID.',
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
                description: 'The dashboard ID, as returned by the create or search endpoints.',
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
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          const { body, resolveHeaders } = await read(
            ctx,
            getCachedDashboardStateSchema(),
            req.params.id,
            isDashboardAppRequest
          );
          return res.ok({
            body,
            ...(isDashboardAppRequest && { headers: resolveHeaders }),
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
            return res.forbidden({ body: { message: e.message } });
          }

          return res.badRequest({ body: { message: e.message } });
        }
      })
  );
}
