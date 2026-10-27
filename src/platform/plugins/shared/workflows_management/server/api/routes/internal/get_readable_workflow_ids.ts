/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetReadableWorkflowIdsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/internal/workflows/readable_workflow_ids',
      access: 'internal',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: false,
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const workflowIds = await api.getReadableWorkflowIds(spaces.getSpaceId(request), request);
          return response.ok({ body: { workflowIds } });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
