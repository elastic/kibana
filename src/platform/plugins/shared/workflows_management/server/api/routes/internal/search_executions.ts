/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchExecutionsViewParams } from '../../workflows_management_service';
import { parseJsonParam, querySchema } from '../executions/search_executions';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerInternalSearchExecutionsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/internal/workflows/executions',
      access: 'internal',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            query: querySchema,
          },
        },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const params: SearchExecutionsViewParams = {
            query: parseJsonParam(request.query.query, 'query'),
            sort: parseJsonParam(request.query.sort, 'sort'),
            from: request.query.from,
            size: request.query.size,
            trackTotalHits: request.query.trackTotalHits,
          };

          return response.ok({
            body: await api.searchExecutionsView(params, spaceId),
          });
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('Invalid JSON in')) {
            return response.badRequest({ body: { message: error.message } });
          }
          return handleRouteError(response, error);
        }
      })
    );
}
