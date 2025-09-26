/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

interface ExecuteWorkflowResponse {
  workflowExecutionId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginSetup {}
export interface WorkflowsExecutionEnginePluginStart {
  executeWorkflow(
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, any>
  ): Promise<ExecuteWorkflowResponse>;
  cancelWorkflowExecution(workflowExecutionId: string, spaceId: string): Promise<void>;
}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  actions: ActionsPluginStartContract;
}
