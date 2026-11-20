/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory } from '@kbn/core-http-server';
import { ReservedPrivilegesSet } from '@kbn/core-http-server';
import { MAX_GATE_ID_LENGTH } from '../lib/constants';
import type { RolloutGatesService } from '../lib/rollout_gates_service';

const paramsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: MAX_GATE_ID_LENGTH }),
});

/**
 * Demo/debug route: the "string in, phase out" entry point for this PoC. Superuser-only,
 * since it exposes build identities that are otherwise internal.
 */
export function registerGetPhaseRoute(
  router: IRouter,
  getService: () => RolloutGatesService | undefined
): void {
  router.get(
    {
      path: '/internal/rollout_gates/{id}',
      validate: { params: paramsSchema },
      security: {
        authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
      },
      options: { access: 'internal' },
    },
    async (_context, request, response) => {
      const service = getService();
      if (!service) {
        return serviceNotStarted(response);
      }

      try {
        const info = await service.getDebugInfo(request.params.id);
        return response.ok({ body: info });
      } catch (error) {
        return response.notFound({ body: { message: (error as Error).message } });
      }
    }
  );
}

function serviceNotStarted(response: KibanaResponseFactory) {
  return response.customError({
    statusCode: 503,
    body: { message: 'Rollout gates are not available until Kibana has started.' },
  });
}
