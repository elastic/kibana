/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import { CreateSecretCommandSchema } from '../../common/types';
import type { SecretsRequestHandlerContext } from '../types';
import { SECRET_ROUTE_OPTIONS } from './route_constants';
import { SECRET_CREATE_SECURITY } from './route_security';

export function registerPostCreateSecretRoute(router: IRouter<SecretsRequestHandlerContext>) {
  router.post(
    {
      path: '/api/secrets',
      options: SECRET_ROUTE_OPTIONS,
      security: SECRET_CREATE_SECURITY,
      validate: {
        body: CreateSecretCommandSchema,
      },
    },
    async (context, request, response) => {
      try {
        const { secretClient } = await context.secrets;
        const createdSecret = await secretClient.create(request.body);
        return response.ok({ body: createdSecret });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to create secret',
          },
        });
      }
    }
  );
}
