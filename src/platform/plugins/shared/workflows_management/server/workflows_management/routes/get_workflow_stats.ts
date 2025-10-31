/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';

export function registerGetWorkflowStatsRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.get(
    {
      path: '/api/workflows/stats',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const stats = await api.getWorkflowStats(spaceId);

        return response.ok({ body: stats || {} });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
