/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import { ERROR_OUTSIDE_PREBOOT_STAGE, ERROR_PING_FAILURE } from '../../common';
import type { PingResult } from '../../common/types';

export function definePingRoute({ router, logger, elasticsearch, preboot }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/ping',
      validate: {
        body: schema.object({
          host: schema.uri({ scheme: ['http', 'https'] }),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!preboot.isSetupOnHold()) {
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot stage`);
        return response.badRequest({
          body: {
            message: 'Cannot process request outside of preboot stage.',
            attributes: { type: ERROR_OUTSIDE_PREBOOT_STAGE },
          },
        });
      }

      let result: PingResult;
      try {
        result = await elasticsearch.ping(request.body.host);
      } catch {
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to ping cluster.', attributes: { type: ERROR_PING_FAILURE } },
        });
      }

      return response.ok({ body: result });
    }
  );
}
