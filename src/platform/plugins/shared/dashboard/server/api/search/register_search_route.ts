/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
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
import { search } from './search';
import { logRequest } from '../log_request';

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

  searchRoute.addVersion(
    {
      version: routeVersion,
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

          const result = await search(ctx, req.query);

          // // Validate response body against the appropriate schema based on the feature flag.
          // if (useAsCodeSearchSchemas) {
          //   searchResponseBodySchema.validate(result);
          // } else {
          //   legacySearchResponseBodySchema.validate(result);
          // }

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
