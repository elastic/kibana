/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';

export function registerPostRunWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/{id}/run',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTE_SECURITY,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          inputs: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (context, request, response) => {
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
        const { inputs } = request.body as { inputs: Record<string, unknown> };
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
          inputs,
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
    }
  );
}
