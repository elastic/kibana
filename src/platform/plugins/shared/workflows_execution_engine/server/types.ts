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
import type { WorkflowExecutionEngineModel, StepTypeDefinition } from '@kbn/workflows';

export interface ExecuteWorkflowResponse {
  workflowExecutionId: string;
}

export interface ExecuteWorkflowStepResponse {
  workflowExecutionId: string;
}

export interface WorkflowsExecutionEnginePluginSetup {
  /**
   * Register a custom step type that can be used in workflows.
   *
   * @param definition - The step type definition including id, schemas, and handler
   * @throws Error if a step type with the same id is already registered
   *
   * @example
   * ```typescript
   * setup(core, plugins) {
   *   plugins.workflowsExecutionEngine.registerStepType({
   *     id: 'custom_step',
   *     title: 'Custom Step',
   *     description: 'A custom step implementation',
   *     inputSchema: z.object({ value: z.string() }),
   *     outputSchema: z.object({ result: z.string() }),
   *     handler: async (context) => {
   *       return { output: { result: 'done' } };
   *     }
   *   });
   * }
   * ```
   */
  registerStepType(definition: StepTypeDefinition): void;
}
export interface WorkflowsExecutionEnginePluginStart {
  executeWorkflow(
    workflow: WorkflowExecutionEngineModel,
    context: Record<string, any>,
    request: KibanaRequest
  ): Promise<ExecuteWorkflowResponse>;

  executeWorkflowStep(
    workflow: WorkflowExecutionEngineModel,
    stepId: string,
    contextOverride: Record<string, any>
  ): Promise<ExecuteWorkflowStepResponse>;

  cancelWorkflowExecution(workflowExecutionId: string, spaceId: string): Promise<void>;

  /**
   * Get all registered custom step types
   * @returns Array of registered step type IDs with their metadata (id, title, description)
   */
  getRegisteredStepTypes(): Array<{ id: string; title: string; description?: string }>;
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
