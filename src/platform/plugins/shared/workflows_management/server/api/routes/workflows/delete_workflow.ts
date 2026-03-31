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
import { idParamSchema } from '../utils/schemas';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerDeleteWorkflowRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .delete({
      path: '/api/workflows/workflow/{id}',
      access: 'public',
      security: WORKFLOW_DELETE_SECURITY,
      summary: 'Delete a workflow',
      description: 'Delete a single workflow by its ID.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/delete_workflow.yaml'),
        },
        validate: {
          request: {
            params: idParamSchema,
            query: schema.object({
              force: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'When true, permanently deletes the workflow (hard delete) instead of soft-deleting it. The workflow ID becomes available for reuse.',
                },
              }),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { id } = request.params;
          const { force } = request.query;
          const spaceId = spaces.getSpaceId(request);
          await api.deleteWorkflows([id], spaceId, request, { force });
          return response.ok();
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
