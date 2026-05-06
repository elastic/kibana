/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH } from '../../common/environment_health';
import { buildEnvironmentHealthResponse } from '../lib/build_environment_health_response';

export function registerEnvironmentHealthRoute(router: IRouter): void {
  router.get(
    {
      path: MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'Route delegates authorization to the scoped Elasticsearch client',
        },
      },
      validate: false,
    },
    async (context, _, response) => {
      const { elasticsearch } = await context.core;
      const body = await buildEnvironmentHealthResponse(elasticsearch.client.asCurrentUser);
      return response.ok({ body });
    }
  );
}
