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
import { once } from 'lodash';
import { getRouteConfig } from '../get_route_config';
import { getCreateRequestBodySchema, getCreateResponseBodySchema } from './schemas';
import { create } from './create';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { telemetryHandler } from '../telemetry_handler';
import { writeErrorHandler } from '../write_error_handler';

export function registerCreateRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  isDashboardAppRequest: boolean
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(isDashboardAppRequest);
  const createRoute = router.post({
    path: basePath,
    summary: 'Create a dashboard',
    ...routeConfig,
    description: 'Creates a new dashboard and returns its ID, full state, and metadata.',
  });

  // Do not call getDashboardStateSchema when registering route.
  // Route is registered during setup and before all plugins have registered embeddable schemas.
  // Instead, use once to only call getDashboardStateSchema the first time a route handler is executed.
  const getCachedDashboardStateSchema = once(() => {
    return getDashboardStateSchema(isDashboardAppRequest);
  });

  createRoute.addVersion(
    {
      version: routeVersion,
      validate: () => ({
        request: {
          body: getCreateRequestBodySchema(isDashboardAppRequest),
        },
        response: {
          201: {
            body: () => getCreateResponseBodySchema(isDashboardAppRequest),
            description: 'created',
          },
          400: {
            description: 'invalid request',
          },
          403: {
            description: 'forbidden',
          },
        },
      }),
    },
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          const result = await create(
            ctx,
            getCachedDashboardStateSchema(),
            req.body,
            isDashboardAppRequest
          );
          return res.created({ body: result });
        } catch (e) {
          return writeErrorHandler(e, res);
        }
      })
  );
}
