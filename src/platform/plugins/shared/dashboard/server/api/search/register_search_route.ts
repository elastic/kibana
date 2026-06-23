/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';

import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
<<<<<<< HEAD
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { schema } from '@kbn/config-schema';
import { AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG } from '@kbn/as-code-shared-schemas';
import { getRouteConfig } from '../get_route_config';
import {
  legacySearchRequestParamsSchema,
  legacySearchResponseBodySchema,
  searchRequestParamsSchema,
  searchResponseBodySchema,
} from './schemas';
=======

import { getRouteConfig } from '../get_route_config';
import { logRequest } from '../log_request';
import { searchRequestParamsSchema, searchResponseBodySchema } from './schemas';
>>>>>>> 1222322b2f8d2e5a968ce90b45e668f8ef5eb7ef
import { search } from './search';
import { getDashboardStateSchema } from '../dashboard_state_schemas';

export function registerSearchRoute(
  router: VersionedRouter<RequestHandlerContext>,
  usageCounter: UsageCounter | undefined,
  logger: Logger
) {
  const { basePath, routeConfig, routeVersion } = getRouteConfig(false);
  const searchRoute = router.get({
    path: `${basePath}`,
    summary: `Search dashboards`,
    ...routeConfig,
    description:
      'Returns a paginated list of dashboards. Each result includes title, description, tags, and metadata, but not the full panel layout. Use `GET /api/dashboards/{id}` to retrieve the complete state.',
  });

  // Do not call getDashboardStateSchema when registering route.
  // Route is registered during setup and before all plugins have registered embeddable schemas.
  // Instead, use once to only call getDashboardStateSchema the first time a route handler is executed.
  const getCachedDashboardStateSchema = once(() => {
    return getDashboardStateSchema(false, true);
  });

  searchRoute.addVersion(
    {
      version: routeVersion,
      options: {
        oasOperationObject: async () =>
          (await import('../oas_examples')).searchDashboardOASOperationObject,
      },
      validate: {
        request: {
          query: schema.oneOf([searchRequestParamsSchema, legacySearchRequestParamsSchema]),
        },
        response: {
          200: {
            body: () => schema.oneOf([searchResponseBodySchema, legacySearchResponseBodySchema]),
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
          500: {
            description: 'internal server error',
          },
        },
      },
    },
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          const {
            core: { featureFlags },
          } = await ctx.resolve(['core']);
          const useAsCodeSearchSchemas = await featureFlags.getBooleanValue(
            AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG,
            false
          );

          // Validate request query against the appropriate schema based on the feature flag.
          if (useAsCodeSearchSchemas) {
            searchRequestParamsSchema.validate(req.query);
          } else {
            legacySearchRequestParamsSchema.validate(req.query);
          }

          const result = await search(ctx, req.query, getCachedDashboardStateSchema());

          // Validate response body against the appropriate schema based on the feature flag.
          if (useAsCodeSearchSchemas) {
            searchResponseBodySchema.validate(result);
          } else {
            legacySearchResponseBodySchema.validate(result);
          }

          return res.ok({ body: result });
        } catch (e) {
          if (e.isBoom && e.output.statusCode === 403) {
            logRequest(logger, req, 'debug', e.message);
            return res.forbidden({ body: { message: e.message } });
          }

          logRequest(logger, req, 'error', e.message);
          return res.customError({ statusCode: 500, body: { message: e.message } });
        }
      })
  );
}
