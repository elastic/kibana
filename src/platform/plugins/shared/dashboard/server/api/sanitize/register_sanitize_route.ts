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
import { once } from 'lodash';
import { DASHBOARD_INTERNAL_API_PATH } from '../../../common/constants';
import { getSanitizeRequestBodySchema, getSanitizeResponseBodySchema } from './schemas';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { sanitize } from './sanitize';

/**
 * Register the sanitize dashboard route.
 * This route uses an internal API path because it is not intended for public use.
 * It is currently used by the dashboard app to sanitize a dashboard for the export share integration.
 */
export function registerSanitizeRoute(router: VersionedRouter<RequestHandlerContext>) {
  const sanitizeRoute = router.post({
    path: `${DASHBOARD_INTERNAL_API_PATH}/_sanitize`,
    summary: 'Sanitize a dashboard',
    security: {
      authz: {
        enabled: false,
        reason: 'Relies on Content Client for authorization',
      },
    },
    access: 'internal',
  });

  // Do not call getDashboardStateSchema when registering route.
  // Route is registered during setup and before all plugins have registered embeddable schemas.
  // Instead, use once to only call getDashboardStateSchema the first time a route handler is executed.
  const getCachedDashboardStateSchema = once(() => {
    return getDashboardStateSchema(false);
  });

  sanitizeRoute.addVersion(
    {
      version: '1',
      validate: () => ({
        request: {
          body: getSanitizeRequestBodySchema(),
        },
        response: {
          200: {
            body: () => getSanitizeResponseBodySchema(),
          },
        },
      }),
    },
    async (_ctx, req, res) => {
      try {
        const result = await sanitize(_ctx, getCachedDashboardStateSchema(), req.body);
        return res.ok({ body: result });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return res.badRequest({
          body: { message },
        });
      }
    }
  );
}
