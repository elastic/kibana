/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { KQLSyntaxError } from '@kbn/es-query';
import type { RouteDependencies } from '../types';
import {
  INTERNAL_API_VERSION,
  MAX_ARRAY_PARAM_SIZE,
  MAX_PAGE_SIZE,
} from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerTriggerEventsLogRoutes(deps: RouteDependencies) {
  const { router, service, spaces } = deps;

  router.versioned
    .post({
      path: '/internal/workflows/trigger_events/_search',
      access: 'internal',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            body: schema.object({
              triggerIds: schema.maybe(
                schema.arrayOf(schema.string(), { maxSize: MAX_ARRAY_PARAM_SIZE })
              ),
              kql: schema.maybe(schema.string()),
              from: schema.maybe(schema.string()),
              to: schema.maybe(schema.string()),
              page: schema.maybe(schema.number({ min: 1 })),
              size: schema.maybe(schema.number({ min: 1, max: MAX_PAGE_SIZE })),
            }),
          },
        },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const { triggerEvents } = await service.getWorkflowsExecutionEngine();
          const { triggerIds, kql, from: fromTs, to: toTs, page, size } = request.body;

          const result = await triggerEvents.searchTriggerEventLog({
            spaceId,
            triggerIds,
            kql,
            from: fromTs,
            to: toTs,
            page,
            size,
          });

          return response.ok({ body: result });
        } catch (error) {
          if (error instanceof KQLSyntaxError) {
            return response.badRequest({
              body: { message: error.shortMessage ?? error.message },
            });
          }
          return handleRouteError(
            response,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      })
    );
}
