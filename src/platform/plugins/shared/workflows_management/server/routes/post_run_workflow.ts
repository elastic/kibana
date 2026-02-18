/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { preprocessAlertInputs } from './lib/preprocess_alert_inputs';
import { WORKFLOW_ROUTE_OPTIONS } from './lib/route_constants';
import { handleRouteError } from './lib/route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from './lib/route_security';
import type { RouteDependencies } from './lib/types';
import { withLicenseCheck } from './lib/with_license_check';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import {
  PostRunWorkflowRequestBody,
  PostRunWorkflowRequestParams,
} from '../../common/model/api/workflows.gen';

export function registerPostRunWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.versioned
    .post({
      access: 'public',
      path: WORKFLOWS_API_PATHS.RUN,
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(PostRunWorkflowRequestParams),
            body: buildRouteValidationWithZod(PostRunWorkflowRequestBody),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { id } = request.params as { id: string };
          const spaceId = spaces.getSpaceId(request);
          const workflow = await api.getWorkflow(id, spaceId);
          if (!workflow) {
            return response.notFound();
          }
          if (!workflow.valid) {
            return response.badRequest({
              body: {
                message: `Workflow is not valid.`,
              },
            });
          }
          if (!workflow.definition) {
            return response.customError({
              statusCode: 500,
              body: {
                message: `Workflow definition is missing.`,
              },
            });
          }
          if (!workflow.enabled) {
            return response.badRequest({
              body: {
                message: `Workflow is disabled. Enable it to run it.`,
              },
            });
          }
          const { inputs } = request.body;

          let processedInputs = inputs;
          const event = inputs.event as { triggerType?: string; alertIds?: unknown[] } | undefined;
          const hasAlertTrigger =
            event?.triggerType === 'alert' && event?.alertIds && event.alertIds.length > 0;
          if (hasAlertTrigger) {
            processedInputs = await preprocessAlertInputs(inputs, context, spaceId, logger);
          }

          const workflowForExecution: WorkflowExecutionEngineModel = {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          };
          const workflowExecutionId = await api.runWorkflow(
            workflowForExecution,
            spaceId,
            processedInputs,
            request
          );
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
