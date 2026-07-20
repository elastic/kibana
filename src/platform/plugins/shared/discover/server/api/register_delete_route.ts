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
import type { VersionedRouter } from '@kbn/core-http-server';
import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { getRouteConfig } from './get_route_config';
import { deleteDiscoverSession } from './session_delete';

export const registerDeleteRoute = (
  router: VersionedRouter<RequestHandlerContext>,
  logger: Logger,
  usageCounter: UsageCounter | undefined
) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  router
    .delete({
      path: `${basePath}/{id}`,
      summary: 'Delete a Discover session',
      description: 'Permanently deletes a Discover session by ID.',
      ...routeConfig,
    })
    .addVersion(
      {
        version: routeVersion,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({
                meta: {
                  description: 'The Discover session ID.',
                },
              }),
            }),
          },
          response: {
            204: { description: 'Deleted' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
            500: { description: 'Internal server error' },
          },
        },
      },
      async (context, request, response) =>
        telemetryHandler(request, usageCounter, async () => {
          try {
            await deleteDiscoverSession(context, request.params.id);
          } catch (error) {
            if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
              const message = `A Discover session with ID [${request.params.id}] was not found.`;
              logRequest(logger, request, 'debug', message);

              return response.notFound({ body: { message } });
            }

            return writeErrorHandler(error, response, logger, request);
          }

          return response.noContent();
        })
    );
};
