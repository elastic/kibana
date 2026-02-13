/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { preprocessAlertInputs } from './lib/preprocess_alert_inputs';
import { WORKFLOW_ROUTE_OPTIONS } from './lib/route_constants';
import { handleRouteError } from './lib/route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from './lib/route_security';
import type { RouteDependencies } from './lib/types';
import { withLicenseCheck } from './lib/with_license_check';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import { PostTestWorkflowRequestBody } from '../../common/model/api/workflows.gen';

export function registerPostTestWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.versioned
    .post({
      access: 'public',
      path: WORKFLOWS_API_PATHS.TEST,
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostTestWorkflowRequestBody),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          if (!request.body.workflowId && !request.body.workflowYaml) {
            return response.badRequest({
              body: {
                message: "Either 'workflowId' or 'workflowYaml' or both must be provided",
              },
            });
          }
          const spaceId = spaces.getSpaceId(request);

          let inputs = request.body.inputs;
          const event = request.body.inputs?.event as
            | { triggerType?: string; alertIds?: unknown[] }
            | undefined;

          const hasAlertTrigger =
            event?.triggerType === 'alert' && event?.alertIds && event.alertIds.length > 0;
          if (hasAlertTrigger) {
            inputs = await preprocessAlertInputs(inputs, context, spaceId, logger);
          }

          const workflowExecutionId = await api.testWorkflow({
            workflowId: request.body.workflowId,
            workflowYaml: request.body.workflowYaml,
            inputs: inputs ?? {},
            spaceId,
            request,
          });

          return response.ok({
            body: {
              workflowExecutionId,
            },
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
