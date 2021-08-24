/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import type { PingResult } from '../../common/types';

export function definePingRoute({
  router,
  logger,
  kibanaConfigWriter,
  elasticsearch,
  preboot,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/ping',
      validate: {
        body: schema.object({
          hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
            minSize: 1,
            maxSize: 1,
          }),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!preboot.isSetupOnHold()) {
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot phase`);
        return response.badRequest();
      }

      let pingResult: PingResult;
      try {
        pingResult = await elasticsearch.ping(request.body.hosts);
      } catch {
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to ping cluster.', attributes: { type: 'ping_failure' } },
        });
      }

      return response.ok({ body: pingResult });
    }
  );
}
