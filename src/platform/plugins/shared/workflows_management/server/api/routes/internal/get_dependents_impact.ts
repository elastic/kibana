/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import { WORKFLOW_DEPENDENTS_IMPACT_ROUTE } from '../../../../common/lib/workflow_dependents/api';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetDependentsImpactRoute(deps: RouteDependencies) {
  const { router, api, spaces } = deps;
  router.versioned
    .post({
      path: WORKFLOW_DEPENDENTS_IMPACT_ROUTE,
      access: 'internal',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Analyze how a workflow draft affects connected workflows',
      description:
        'Grade the workflows that run this workflow, and the workflows it runs, against a draft of its YAML.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: idParamSchema,
            body: schema.object({
              yaml: schema.maybe(schema.string({ maxLength: MAX_WORKFLOW_YAML_LENGTH })),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const body = await api.getWorkflowDependentsImpact(
            request.params.id,
            spaceId,
            request,
            request.body.yaml
          );
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
