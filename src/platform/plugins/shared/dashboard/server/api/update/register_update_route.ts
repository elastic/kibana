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
import { getUpdateRequestBodySchema, getUpdateResponseBodySchema } from './schemas';
import { update } from './update';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { writeErrorHandler } from '../write_error_handler';

export function registerUpdateRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  isDashboardAppRequest: boolean
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(isDashboardAppRequest);
  const updateRoute = router.put({
    path: `${basePath}/{id}`,
    ...routeConfig,
    summary: `Upsert a dashboard`,
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
            // Can not validate id at route level
            // existing dashboards may have invalid "as code" ids
            id: schema.string(),
          }),
          body: getUpdateRequestBodySchema(isDashboardAppRequest),
        },
        response: {
          200: {
            body: () => getUpdateResponseBodySchema(isDashboardAppRequest),
            description: 'updated',
          },
          201: {
            body: () => getUpdateResponseBodySchema(isDashboardAppRequest),
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
          const result = await update(
            ctx,
            getCachedDashboardStateSchema(),
            req.params.id,
            req.body,
            req.serverTiming,
            isDashboardAppRequest
          );
          return result.meta.updated_at === result.meta.created_at
            ? res.created({ body: result })
            : res.ok({ body: result });
        } catch (e) {
          return writeErrorHandler(e, res);
        }
      })
  );
}
