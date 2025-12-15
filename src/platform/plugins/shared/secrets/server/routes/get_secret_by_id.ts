/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import { SECRET_ROUTE_OPTIONS } from './route_constants';
import { SECRET_READ_SECURITY } from './route_security';
import type { SecretsRequestHandlerContext } from '../types';

export function registerGetSecretByIdRoute(router: IRouter<SecretsRequestHandlerContext>) {
  router.get(
    {
      path: '/api/secrets/{id}',
      options: SECRET_ROUTE_OPTIONS,
      security: SECRET_READ_SECURITY,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params;
        const { secretClient } = await context.secrets;
        const secretsResponse = await secretClient.getSecret(id);
        return response.ok({
          body: secretsResponse,
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to search secrets',
          },
        });
      }
    }
  );
}
