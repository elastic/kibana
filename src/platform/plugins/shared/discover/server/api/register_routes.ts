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
import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { createDiscoverSession } from './session_create';
import { getRouteConfig } from './get_route_config';
import { discoverSessionApiDataSchema, discoverSessionApiResponseSchema } from './schema';

export const registerRoutes = (
  http: HttpServiceSetup,
  logger: Logger,
  usageCounter: UsageCounter | undefined
) => {
  const { versioned } = http.createRouter();
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  versioned
    .post({
      path: basePath,
      summary: 'Create a Discover session',
      ...routeConfig,
    })
    .addVersion(
      {
        version: routeVersion,
        validate: {
          request: {
            body: discoverSessionApiDataSchema,
          },
          response: {
            201: {
              body: () => discoverSessionApiResponseSchema,
              description: 'Created',
            },
            400: { description: 'Invalid request' },
            403: { description: 'Forbidden' },
          },
        },
      },
      async (context, request, response) =>
        telemetryHandler(request, usageCounter, async () => {
          try {
            const body = await createDiscoverSession(context, request.body);

            return response.created({ body });
          } catch (error) {
            return writeErrorHandler(error, response, logger, request);
          }
        })
    );
};
