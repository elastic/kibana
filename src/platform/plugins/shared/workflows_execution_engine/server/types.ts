/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

export interface ExecuteWorkflowResponse {
  workflowExecutionId: string;
}

export interface ExecuteWorkflowStepResponse {
  workflowExecutionId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExecutionEnginePluginSetup {}
export interface WorkflowsExecutionEnginePluginStart {
  executeWorkflow(
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, any>,
    request: KibanaRequest
  ): Promise<ExecuteWorkflowResponse>;

  executeWorkflowStep(
    workflow: WorkflowExecutionEngineModel,
    stepId: string,
    contextOverride: Record<string, any>,
    request?: KibanaRequest
  ): Promise<ExecuteWorkflowStepResponse>;

  cancelWorkflowExecution(workflowExecutionId: string, spaceId: string): Promise<void>;
}

export interface WorkflowsExecutionEnginePluginSetupDeps {
  taskManager: TaskManagerSetupContract;
  cloud: CloudSetup;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  actions: ActionsPluginStartContract;
  cloud: CloudStart;
}
