/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import { schema } from '@kbn/config-schema';
import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { createDiscoverSession } from './session_create';
import { getDiscoverSession } from './session_get';
import { getRouteConfig } from './get_route_config';
import {
  discoverSessionApiDataSchema,
  discoverSessionApiResponseSchema,
  discoverSessionIdSchema,
} from './schema';

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

  versioned
    .get({
      path: `${basePath}/{id}`,
      summary: 'Get a Discover session',
      description: 'Returns the complete state of a Discover session by ID.',
      ...routeConfig,
    })
    .addVersion(
      {
        version: routeVersion,
        validate: {
          request: {
            params: schema.object({
              id: discoverSessionIdSchema,
            }),
          },
          response: {
            200: {
              body: () => discoverSessionApiResponseSchema,
              description: 'Success',
            },
            400: { description: 'Invalid request' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
            409: { description: 'Conflict' },
          },
        },
      },
      async (context, request, response) =>
        telemetryHandler(request, usageCounter, async () => {
          try {
            const body = await getDiscoverSession(context, request.params.id);

            return response.ok({ body });
          } catch (error) {
            if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
              const message = `A Discover session with ID [${request.params.id}] was not found.`;
              logRequest(logger, request, 'debug', message);

              return response.notFound({ body: { message } });
            }

            return writeErrorHandler(error, response, logger, request);
          }
        })
    );
};
