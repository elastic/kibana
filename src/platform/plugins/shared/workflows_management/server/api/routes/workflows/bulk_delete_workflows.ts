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
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_DELETE_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

const MAX_BULK_DELETE_BATCH_SIZE = 1000;

export function registerBulkDeleteWorkflowsRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .delete({
      path: '/api/workflows',
      access: 'public',
      security: WORKFLOW_DELETE_SECURITY,
      summary: 'Bulk delete workflows',
      description: 'Delete multiple workflows by their IDs.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/bulk_delete_workflows.yaml'),
        },
        validate: {
          request: {
            query: schema.object({
              force: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'When true, permanently deletes the workflows (hard delete) instead of soft-deleting them. The workflow IDs become available for reuse.',
                },
              }),
            }),
            body: schema.object({
              ids: schema.arrayOf(
                schema.string({ meta: { description: 'Workflow ID to delete.' } }),
                {
                  maxSize: MAX_BULK_DELETE_BATCH_SIZE,
                  meta: { description: 'Array of workflow IDs to delete.' },
                }
              ),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        const { force } = request.query;
        try {
          const { ids } = request.body;
          const spaceId = spaces.getSpaceId(request);
          const result = await api.deleteWorkflows(ids, spaceId, request, { force });
          const { successfulIds = [], ...responseBody } = result;
          audit.logBulkWorkflowDeleteResults(request, {
            successfulIds,
            failures: result.failures,
            force,
          });
          return response.ok({ body: responseBody });
        } catch (error) {
          audit.logBulkWorkflowDeleteFailed(request, error, { force });
          return handleRouteError(response, error);
        }
      })
    );
}
