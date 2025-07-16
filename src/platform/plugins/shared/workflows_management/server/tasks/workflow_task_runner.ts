/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { WorkflowsService } from '../workflows_management/workflows_management_service';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';

export interface WorkflowTaskParams {
  workflowId: string;
  spaceId: string;
}

export interface WorkflowTaskState {
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
  lastRunError?: string;
}

export function createWorkflowTaskRunner({
  logger,
  workflowsService,
  workflowsExecutionEngine,
}: {
  logger: Logger;
  workflowsService: WorkflowsService;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
}) {
  return ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    const { workflowId, spaceId } = taskInstance.params as WorkflowTaskParams;
    const state = taskInstance.state as WorkflowTaskState;

    return {
      async run() {
        logger.info(`Running scheduled workflow task for workflow ${workflowId}`);
        
        try {
          // Get the workflow
          const workflow = await workflowsService.getWorkflow(workflowId);
          if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
          }

          // Convert to execution model
          const workflowExecutionModel = {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            triggers: workflow.triggers,
            steps: workflow.steps,
          };

          // Execute the workflow
          const executionId = await workflowsExecutionEngine.executeWorkflow(
            workflowExecutionModel,
            {
              workflowRunId: `scheduled-${Date.now()}`,
              inputs: {},
              event: {
                type: 'scheduled',
                timestamp: new Date().toISOString(),
                source: 'task-manager',
              },
              connectorCredentials: {},
            }
          );

          logger.info(`Successfully executed scheduled workflow ${workflowId}, execution ID: ${executionId}`);

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