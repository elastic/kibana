/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StartServicesAccessor, IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export function registerKqlTelemetryRoute(
  router: IRouter,
  getStartServices: StartServicesAccessor,
  logger: Logger
) {
  router.post(
    {
      path: '/api/kibana/kql_opt_in_stats',
      validate: {
        body: schema.object({
          opt_in: schema.boolean(),
        }),
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
        await internalRepository.incrementCounter('kql-telemetry', 'kql-telemetry', [counterName]);
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
