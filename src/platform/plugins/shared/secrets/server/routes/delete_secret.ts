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
import type { SecretsRequestHandlerContext } from '../types';
import { SECRET_ROUTE_OPTIONS } from './route_constants';
import { SECRET_DELETE_SECURITY } from './route_security';

export function registerDeleteSecretRoute(router: IRouter<SecretsRequestHandlerContext>) {
  router.delete(
    {
      path: '/api/secrets/{name}',
      options: SECRET_ROUTE_OPTIONS,
      security: SECRET_DELETE_SECURITY,
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { name } = request.params;
        const { secretClient } = await context.secrets;
        await secretClient.delete(name);
        return response.ok();
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to delete secret' },
        });
      }
    }
  );
}
