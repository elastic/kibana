/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BulkCreateWorkflowsCommandSchema } from '@kbn/workflows';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_CREATE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerPostBulkCreateWorkflowsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/_bulk_create',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_CREATE_SECURITY,
      validate: {
        body: BulkCreateWorkflowsCommandSchema,
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const result = await api.bulkCreateWorkflows(request.body.workflows, spaceId, request);
        return response.ok({ body: result });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
