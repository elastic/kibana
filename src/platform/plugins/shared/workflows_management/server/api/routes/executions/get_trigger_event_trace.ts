/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { executionIdParamSchema } from '../utils/schemas';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerGetTriggerEventTraceRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/executions/{executionId}/trigger_event_trace',
      access: 'public',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      summary: 'Get trigger event trace for an execution',
      description:
        'Returns audit data from the internal trigger-events stream for event-driven runs: the dispatch that scheduled this execution and downstream dispatches emitted during the run.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/get_trigger_event_trace.yaml'),
        },
        validate: {
          request: {
            params: executionIdParamSchema,
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { executionId } = request.params;
          const spaceId = spaces.getSpaceId(request);
          const trace = await api.getTriggerEventTrace(executionId, spaceId);
          if (!trace) {
            return response.notFound();
          }
          return response.ok({ body: trace });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
