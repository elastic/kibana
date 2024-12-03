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

export function defineVerifyRoute({ router, verificationCode }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/verify',
      security: {
        authz: {
          enabled: false,
          reason:
            'Interactive setup is strictly a "pre-boot" feature which cannot leverage conventional authorization.',
        },
      },
      validate: {
        body: schema.object({
          code: schema.string(),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!verificationCode.verify(request.body.code)) {
        return response.forbidden({
          body: {
            message: verificationCode.remainingAttempts
              ? 'Invalid verification code.'
              : 'Maximum number of attempts exceeded. Restart Kibana to generate a new code and retry.',
            attributes: {
              remainingAttempts: verificationCode.remainingAttempts,
            },
          },
        });
      }

      return response.noContent();
    }
  );
}
