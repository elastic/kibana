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
import { withLicenseCheck } from '../lib/with_license_check';

export function registerGetChildWorkflowExecutionsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflowExecutions/{workflowExecutionId}/childExecutions',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const spaceId = spaces.getSpaceId(request);
        const childExecutions = await api.getChildWorkflowExecutions(workflowExecutionId, spaceId);
        return response.ok({
          body: childExecutions,
        });
      } catch (error) {
        const statusCode =
          error instanceof Error &&
          'meta' in error &&
          typeof (error as { meta?: { statusCode?: number } }).meta?.statusCode === 'number'
            ? (error as { meta: { statusCode: number } }).meta.statusCode
            : undefined;
        if (statusCode === 404) {
          return response.notFound();
        }
        return handleRouteError(response, error);
      }
    })
  );
}
