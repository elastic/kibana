/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, MAX_ARRAY_PARAM_SIZE, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerPollExecutionStatusRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .post({
      path: '/api/workflows/executions/_poll_status',
      access: 'public',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      summary: 'Poll workflow execution statuses',
      description:
        'Long-polls for one or more workflow executions, returning when any execution finishes or the timeout is reached.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            body: schema.object({
              ids: schema.arrayOf(schema.string(), {
                minSize: 1,
                maxSize: MAX_ARRAY_PARAM_SIZE,
                meta: { description: 'Execution IDs to poll.' },
              }),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { ids } = request.body;
          const spaceId = spaces.getSpaceId(request);
          const statuses = await api.pollExecutionStatus(ids, spaceId, request.events.aborted$);
          return response.ok({ body: { statuses } });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
