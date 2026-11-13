/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_REMOVAL_IMPACT_IDS,
  WORKFLOW_REMOVAL_IMPACT_ROUTE,
} from '../../../../common/lib/workflow_dependents/api';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetRemovalImpactRoute(deps: RouteDependencies) {
  const { router, api, spaces } = deps;
  router.versioned
    .post({
      path: WORKFLOW_REMOVAL_IMPACT_ROUTE,
      access: 'internal',
      security: WORKFLOW_READ_SECURITY,
      summary: 'List workflows that fail when workflows are turned off or deleted',
      description:
        'List the enabled workflows that run any of the given workflows, and so fail once those stop running.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            body: schema.object({
              ids: schema.arrayOf(schema.string({ maxLength: 255 }), {
                minSize: 1,
                maxSize: MAX_REMOVAL_IMPACT_IDS,
              }),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const body = await api.getWorkflowRemovalImpact(request.body.ids, spaceId, request);
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
