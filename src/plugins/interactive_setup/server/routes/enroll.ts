/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from './';

/**
 * Defines routes to deal with Elasticsearch `enroll_kibana` APIs.
 */
export function defineEnrollRoutes({ router }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/enroll',
      validate: {
        body: schema.object({ token: schema.string() }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      return response.forbidden({
        body: { message: `API is not implemented yet.` },
      });
    }
  );
}
