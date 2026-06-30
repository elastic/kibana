/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteDependencies } from '../types';
import { AVAILABILITY, INTERNAL_API_VERSION, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from '../utils/route_security';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerPrepareWebhookRoute(deps: RouteDependencies) {
  const { router, api, spaces } = deps;

  router.versioned
    .post({
      path: '/internal/workflows/workflow/{id}/webhook/prepare',
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Prepare a workflow webhook trigger',
      description:
        'Creates the dispatcher task and workflow-bound credentials needed to invoke a webhook trigger.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: idParamSchema,
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const result = await api.prepareWebhookTrigger(
            request.params.id,
            spaces.getSpaceId(request),
            request
          );
          return response.ok({ body: result });
        } catch (error) {
          if (error instanceof Error && error.message.includes('does not define a webhook')) {
            return response.badRequest({
              body: {
                message: error.message,
              },
            });
          }
          return handleRouteError(response, error as Error);
        }
      })
    );
}
