/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { MAX_PAGE_SIZE } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerGetWorkflowHistoryRoute({ router, api, spaces }: RouteDependencies) {
  router.get(
    {
      path: '/api/workflows/{id}/history',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          from: schema.maybe(schema.number({ min: 0 })),
          size: schema.maybe(schema.number({ min: 1, max: MAX_PAGE_SIZE })),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const spaceId = spaces.getSpaceId(request);
        const { from, size } = (request.query ?? {}) as { from?: number; size?: number };
        const result = await api.getWorkflowHistory(id, spaceId, { from, size });
        return response.ok({ body: result });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
