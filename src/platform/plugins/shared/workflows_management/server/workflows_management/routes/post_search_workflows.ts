/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchWorkflowCommandSchema } from '@kbn/workflows';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';
import type { GetWorkflowsParams } from '../workflows_management_api';

export function registerPostSearchWorkflowsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/search',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: {
        body: SearchWorkflowCommandSchema,
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { size, page, enabled, createdBy, tags, query } =
          request.body as unknown as GetWorkflowsParams;

        const spaceId = spaces.getSpaceId(request);
        return response.ok({
          body: await api.getWorkflows(
            {
              size,
              page,
              enabled,
              createdBy,
              tags,
              query,
            },
            spaceId
          ),
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
