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

/**
 * Register the POST /api/workflows/execute_sync route.
 * 
 * This route is used by the ES|QL WORKFLOW command to execute workflows
 * synchronously and receive the output inline. Unlike the standard run
 * endpoint which returns immediately with an execution ID, this endpoint
 * waits for the workflow to complete and returns the output.
 * 
 * This is a POC implementation for the ES|QL WORKFLOW command.
 */
export function registerPostExecuteSyncRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/execute_sync',
      options: {
        ...WORKFLOW_ROUTE_OPTIONS,
        // Must be 'public' to allow external access from ES|QL WORKFLOW command
        access: 'public',
      },
      security: WORKFLOW_EXECUTE_SECURITY,
      validate: {
        body: schema.object({
          workflowId: schema.string(),
          inputs: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workflowId, inputs } = request.body;
        const spaceId = spaces.getSpaceId(request);

        logger.debug(`ES|QL WORKFLOW: Executing workflow [${workflowId}] synchronously`);

        // Get the workflow definition - supports both ID and name lookup
        let workflow = await api.getWorkflow(workflowId, spaceId);
        
        // If not found by ID, try to find by name
        if (!workflow) {
          logger.debug(`ES|QL WORKFLOW: Workflow not found by ID, trying by name: ${workflowId}`);
          
          // Search for workflows with matching name
          const searchResult = await api.getWorkflows(
            { query: workflowId, size: 100, page: 1 },
            spaceId
          );
          
          // Filter for exact name matches (query might return partial matches)
          const exactNameMatches = searchResult.results.filter(
            (w) => w.name === workflowId
          );
          
          if (exactNameMatches.length === 0) {
            return response.notFound({
              body: {
                message: `Workflow [${workflowId}] not found. Provide a valid workflow ID or name.`,
              },
            });
          } else if (exactNameMatches.length === 1) {
            // Single match - use it
            workflow = await api.getWorkflow(exactNameMatches[0].id, spaceId);
            logger.debug(`ES|QL WORKFLOW: Found workflow by name: ${workflow?.id}`);
          } else {
            // Multiple matches - return error with IDs
            const workflowIds = exactNameMatches.map((w) => w.id).join(', ');
            return response.badRequest({
              body: {
                message: `Multiple workflows found with name '${workflowId}'. Use workflow ID instead: ${workflowIds}`,
              },
            });
          }
        }
        
        if (!workflow) {
          return response.notFound({
            body: {
              message: `Workflow [${workflowId}] not found`,
            },
          });
        }

        if (!workflow.valid) {
          return response.badRequest({
            body: {
              message: `Workflow [${workflowId}] is not valid`,
            },
          });
        }

        if (!workflow.definition) {
          return response.customError({
            statusCode: 500,
            body: {
              message: `Workflow [${workflowId}] has no definition`,
            },
          });
        }

        if (!workflow.enabled) {
          return response.badRequest({
            body: {
              message: `Workflow [${workflowId}] is disabled. Enable it to run.`,
            },
          });
        }

        // Prepare workflow for execution
        const workflowForExecution: WorkflowExecutionEngineModel = {
          id: workflow.id,
          name: workflow.name,
          enabled: workflow.enabled,
          definition: workflow.definition,
          yaml: workflow.yaml,
          isTestRun: false, // Real execution, but synchronous
          spaceId: workflow.spaceId,
        };

        // Execute workflow synchronously and get output
        const output = await api.runWorkflowSync(
          workflowForExecution,
          spaceId,
          inputs,
          request
        );

        logger.debug(`ES|QL WORKFLOW: Workflow [${workflowId}] completed successfully`);

        return response.ok({
          body: {
            workflowId,
            output,
          },
        });
      } catch (error) {
        logger.error(`ES|QL WORKFLOW: Execution failed: ${error}`);
        return handleRouteError(response, error);
      }
    }
  );
}
