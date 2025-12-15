/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import { SECRET_ROUTE_OPTIONS } from './route_constants';
import { SECRET_READ_SECURITY } from './route_security';
import type { SecretsRequestHandlerContext } from '../types';
import { SearchSecretsParamsSchema } from '../../common/types';

export function registerGetSearchSecretsRoute(router: IRouter<SecretsRequestHandlerContext>) {
  router.get(
    {
      path: '/api/secrets',
      options: SECRET_ROUTE_OPTIONS,
      security: SECRET_READ_SECURITY,
      validate: {
        query: SearchSecretsParamsSchema,
      },
    },
    async (context, request, response) => {
      try {
        const { name, description } = request.query;
        const { secretClient } = await context.secrets;
        const secretsResponse = await secretClient.searchSecrets({ name, description });
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
