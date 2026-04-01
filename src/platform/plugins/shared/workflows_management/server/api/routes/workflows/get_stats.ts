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
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerGetStatsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/stats',
      access: 'public',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Get workflow statistics',
      description:
        'Retrieve summary statistics about workflows, including total, enabled, and disabled counts, as well as execution history metrics for the last 30 days.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/get_stats.yaml'),
        },
        validate: false,
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const stats = await api.getWorkflowStats(spaceId);
          return response.ok({ body: stats || {} });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
