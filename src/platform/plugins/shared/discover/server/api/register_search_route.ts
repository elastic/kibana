/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { writeErrorHandler } from '@kbn/as-code-utils';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { getRouteConfig } from './get_route_config';
import { discoverSessionSearchParamsSchema, discoverSessionSearchResponseSchema } from './schema';
import { searchDiscoverSessions } from './session_search';

export const registerSearchRoute = (
  router: VersionedRouter<RequestHandlerContext>,
  logger: Logger,
  usageCounter: UsageCounter | undefined
) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  router
    .get({
      path: basePath,
      summary: 'Search Discover sessions',
      description:
        'Returns a paginated summary list of Discover sessions. Use `GET /api/discover_sessions/{id}` for the full session state.',
      ...routeConfig,
    })
    .addVersion(
      {
        version: routeVersion,
        validate: {
          request: {
            query: discoverSessionSearchParamsSchema,
          },
          response: {
            200: {
              body: () => discoverSessionSearchResponseSchema,
              description: 'Success',
            },
            400: { description: 'Invalid request' },
            500: { description: 'Internal server error' },
          },
        },
      },
      async (context, request, response) =>
        telemetryHandler(request, usageCounter, async () => {
          try {
            const body = await searchDiscoverSessions(context, request.query);

            return response.ok({ body });
          } catch (error) {
            return writeErrorHandler(error, response, logger, request);
          }
        })
    );
};
