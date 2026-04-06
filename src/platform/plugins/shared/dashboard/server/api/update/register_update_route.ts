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
import { once } from 'lodash';
import { getRouteConfig } from '../get_route_config';
import { getUpdateRequestBodySchema, getUpdateResponseBodySchema } from './schemas';
import { update } from './update';
import { allowUnmappedKeysSchema, getDashboardStateSchema } from '../dashboard_state_schemas';

export function registerUpdateRoute(
  router: VersionedRouter<RequestHandlerContext>,
  isDashboardAppRequest: boolean
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(isDashboardAppRequest);
  const updateRoute = router.put({
    path: `${basePath}/{id}`,
    summary: `Replace current dashboard state with the dashboard state from request body.`,
    ...routeConfig,
  });

  // Do not call getDashboardStateSchema when registering route.
  // Route is registered during setup and before all plugins have registered embeddable schemas.
  // Instead, use once to only call getDashboardStateSchema the first time a route handler is executed.
  const getCachedDashboardStateSchema = once(() => {
    return getDashboardStateSchema(isDashboardAppRequest);
  });

  updateRoute.addVersion(
    {
      version: routeVersion,
      validate: () => ({
        request: {
          params: schema.object({
            id: schema.string({
              meta: { description: 'A unique identifier for the dashboard.' },
            }),
          }),
          query: schema.maybe(
            schema.object({
              allowUnmappedKeys: schema.maybe(allowUnmappedKeysSchema),
            })
          ),
          body: getUpdateRequestBodySchema(isDashboardAppRequest),
        },
        response: {
          200: {
            body: () => getUpdateResponseBodySchema(isDashboardAppRequest),
            description: 'Indicates the dashboard is updated successfully',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates that the dashboard with the given ID is not found.',
          },
        },
      }),
    },
    async (ctx, req, res) => {
      try {
        const result = await update(
          ctx,
          getCachedDashboardStateSchema(),
          req.params.id,
          req.body,
          isDashboardAppRequest
        );
        return res.ok({ body: result });
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
    }
  );
}
