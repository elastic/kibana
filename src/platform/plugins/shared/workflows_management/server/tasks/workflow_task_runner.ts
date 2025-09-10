/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowsService } from '../workflows_management/workflows_management_service';

export interface WorkflowTaskParams {
  workflowId: string;
  spaceId: string;
}

export interface WorkflowTaskState {
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
  lastRunError?: string;
}

// This function creates a task runner for scheduled workflow tasks
// It will be used by the Task Manager to run the workflow execution
export function createWorkflowTaskRunner({
  logger,
  workflowsService,
  workflowsExecutionEngine,
  actionsClient,
}: {
  logger: Logger;
  workflowsService: WorkflowsService;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actionsClient: IUnsecuredActionsClient;
}) {
  return ({ taskInstance, fakeRequest }: { taskInstance: ConcreteTaskInstance; fakeRequest?: KibanaRequest }) => {
    const { workflowId, spaceId } = taskInstance.params as WorkflowTaskParams;
    const state = taskInstance.state as WorkflowTaskState;

    return {
      async run() {
        logger.info(`Running scheduled workflow task for workflow ${workflowId}`);

        try {
          // Get the workflow
          const workflow = await workflowsService.getWorkflow(workflowId, spaceId);
          if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
          }

          if (!workflow.definition) {
            throw new Error(`Workflow definition not found: ${workflowId}`);
          }

          if (!workflow.valid) {
            throw new Error(`Workflow is not valid: ${workflowId}`);
          }

          // Convert to execution model
          const workflowExecutionModel: WorkflowExecutionEngineModel = {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          };

          // Execute the workflow with user context from fakeRequest if available
          const executionContext = {
            workflowRunId: `scheduled-${Date.now()}`,
            spaceId,
            inputs: {},
            event: {
              type: 'scheduled',
              timestamp: new Date().toISOString(),
              source: 'task-manager',
            },
            triggeredBy: 'scheduled', // <-- mark as scheduled
          };

          const executionId = fakeRequest
            ? await workflowsExecutionEngine.executeWorkflow(
                workflowExecutionModel,
                executionContext,
                fakeRequest // Pass the fakeRequest for user context
              )
            : await workflowsExecutionEngine.executeWorkflow(
                workflowExecutionModel,
                executionContext,
                {} as any // Fallback when no user context is available
              );

          logger.info(
            `Successfully executed scheduled workflow ${workflowId}, execution ID: ${executionId}`
          );

          return {
            state: {
              ...state,
              lastRunAt: new Date().toISOString(),
              lastRunStatus: 'success',
              lastRunError: undefined,
            },
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to execute scheduled workflow ${workflowId}: ${errorMessage}`);

          return {
            state: {
              ...state,
              lastRunAt: new Date().toISOString(),
              lastRunStatus: 'failed',
              lastRunError: errorMessage,
            },
          };
        }
      },

      async cancel() {
        logger.info(`Cancelling scheduled workflow task for workflow ${workflowId}`);
      },
    };
  };
}
