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
import { SECRET_UPDATE_SECURITY } from './route_security';
import type { SecretsRequestHandlerContext } from '../types';
import { UpdateSecretCommandSchema } from '../../common/types';

export function registerUpdateSecretRoute(router: IRouter<SecretsRequestHandlerContext>) {
  router.put(
    {
      path: '/api/secrets/{name}',
      options: SECRET_ROUTE_OPTIONS,
      security: SECRET_UPDATE_SECURITY,
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: UpdateSecretCommandSchema,
      },
    },
    async (context, request, response) => {
      try {
        const { name } = request.params;
        const { secretClient } = await context.secrets;
        const updatedSecret = await secretClient.update(name, request.body);
        return response.ok({ body: updatedSecret });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to update secret' },
        });
      }
    }
  );
}
