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
import { WORKFLOW_EXECUTION_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { MAX_PAGE_SIZE } from './types';
import { withLicenseCheck } from '../lib/with_license_check';
import type { SearchStepExecutionsParams } from '../workflows_management_api';

export function registerGetWorkflowStepExecutionsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflowExecutions/{workflowId}/steps',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      validate: {
        params: schema.object({
          workflowId: schema.string(),
        }),
        query: schema.object({
          stepId: schema.maybe(schema.string()),
          includeInput: schema.maybe(schema.boolean()),
          includeOutput: schema.maybe(schema.boolean()),
          page: schema.maybe(schema.number({ min: 1 })),
          size: schema.maybe(schema.number({ min: 1, max: MAX_PAGE_SIZE })),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const { workflowId } = request.params;
        const query = request.query;

        const params: SearchStepExecutionsParams = {
          workflowId,
          stepId: query.stepId,
          includeInput: query.includeInput ?? false,
          includeOutput: query.includeOutput ?? false,
          page: query.page,
          size: query.size,
        };

        return response.ok({
          body: await api.searchStepExecutions(params, spaceId),
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
