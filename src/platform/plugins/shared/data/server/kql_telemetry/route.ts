/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StartServicesAccessor, IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { KQL_TELEMETRY_ROUTE_LATEST_VERSION } from '../../common/constants';

export function registerKqlTelemetryRoute(
  router: IRouter,
  getStartServices: StartServicesAccessor,
  logger: Logger
) {
  router.versioned
    .post({
      path: '/internal/kql_opt_in_stats',
      access: 'internal',
    })
    .addVersion(
      {
        version: KQL_TELEMETRY_ROUTE_LATEST_VERSION,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          request: {
            body: schema.object({
              opt_in: schema.boolean(),
            }),
          },
          response: {
            '200': {
              body: () =>
                schema.object({
                  success: schema.boolean(),
                }),
            },
          },
        },
      },
      async (context, request, response) => {
        const [{ savedObjects }] = await getStartServices();
        const internalRepository = savedObjects.createInternalRepository();

        const {
          body: { opt_in: optIn },
        } = request;

        const counterName = optIn ? 'optInCount' : 'optOutCount';

        try {
          await internalRepository.incrementCounter('kql-telemetry', 'kql-telemetry', [
            counterName,
          ]);
        } catch (error) {
          logger.warn(`Unable to increment counter: ${error}`);
          return response.customError({
            statusCode: error.status,
            body: {
              message: 'Something went wrong',
              attributes: {
                success: false,
              },
            },
          });
        }

        return response.ok({ body: { success: true } });
      }
    );
}
