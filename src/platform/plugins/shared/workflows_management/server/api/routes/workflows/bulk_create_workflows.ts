/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import { BulkCreateWorkflowsCommandSchema } from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_BULK_CREATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerBulkCreateWorkflowsRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .post({
      path: '/api/workflows',
      access: 'public',
      security: WORKFLOW_BULK_CREATE_SECURITY,
      summary: 'Bulk create workflows',
      description:
        'Create multiple workflows in a single request. Optionally overwrite existing workflows.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/bulk_create_workflows.yaml'),
        },
        validate: {
          request: {
            query: schema.object({
              overwrite: schema.boolean({
                defaultValue: false,
                meta: { description: 'Whether to overwrite existing workflows.' },
              }),
            }),
            body: BulkCreateWorkflowsCommandSchema,
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const { overwrite } = request.query;
          const result = await api.bulkCreateWorkflows(request.body.workflows, spaceId, request, {
            overwrite,
          });
          audit.logBulkWorkflowCreateResults(request, {
            created: result.created,
            failed: result.failed,
          });
          return response.ok({ body: result });
        } catch (error) {
          audit.logWorkflowCreateFailed(request, error, {
            bulkOperation: true,
          });
          return handleRouteError(response, error);
        }
      })
    );
}
