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
import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { AVAILABILITY, INTERNAL_API_VERSION, OAS_TAG } from '../utils/route_constants';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerValidateWorkflowRoute({ router, api, spaces, logger }: RouteDependencies) {
  router.versioned
    .post({
      path: '/api/workflows/validate',
      // This routes is not ready for public use yet. Turning it to public will make it available to public API docs.
      access: 'internal',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Validate a workflow',
      description: 'Validate a workflow YAML definition without saving it.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/validate_workflow.yaml'),
        },
        validate: {
          request: {
            body: schema.object({
              yaml: schema.string({
                meta: { description: 'Workflow YAML definition to validate.' },
                maxLength: MAX_WORKFLOW_YAML_LENGTH,
              }),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const result = await api.validateWorkflow(request.body.yaml, spaceId, request);
          return response.ok({ body: result });
        } catch (error) {
          logger.error(error);
          return response.customError({
            statusCode: 500,
            body: { message: `Internal server error: ${error.message}` },
          });
        }
      })
    );
}
