/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  EsWorkflow,
  WorkflowExecuteAsyncStep,
  WorkflowExecuteStep,
  WorkflowRepository,
} from '@kbn/workflows';
import type { WorkflowExecuteAsyncGraphNode, WorkflowExecuteGraphNode } from '@kbn/workflows/graph';
import { WorkflowExecuteAsyncStrategy } from './strategies/workflow_execute_async_strategy';
import { WorkflowExecuteSyncStrategy } from './strategies/workflow_execute_sync_strategy';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../types';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class WorkflowExecuteStepImpl implements NodeImplementation {
  private syncExecutor: WorkflowExecuteSyncStrategy;
  private asyncExecutor: WorkflowExecuteAsyncStrategy;

  constructor(
    private node: WorkflowExecuteGraphNode | WorkflowExecuteAsyncGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowRepository: WorkflowRepository,
    private spaceId: string,
    private request: KibanaRequest,
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart,
    workflowExecutionRepository: WorkflowExecutionRepository,
    stepExecutionRepository: StepExecutionRepository,
    workflowLogger: IWorkflowEventLogger
  ) {
    this.syncExecutor = new WorkflowExecuteSyncStrategy(
      workflowsExecutionEngine,
      workflowExecutionRepository,
      stepExecutionRepository,
      stepExecutionRuntime,
      workflowExecutionRuntime,
      workflowLogger
    );
    this.asyncExecutor = new WorkflowExecuteAsyncStrategy(
      workflowsExecutionEngine,
      workflowExecutionRepository,
      stepExecutionRuntime,
      workflowExecutionRuntime,
      workflowLogger
    );
  }

  async run(): Promise<void> {
    // Start step execution to ensure stepType and stepId are set
    // This is important for frontend rendering even if the step fails early
    this.stepExecutionRuntime.startStep();
    await this.stepExecutionRuntime.flushEventLogs();

    const step = this.node.configuration as WorkflowExecuteStep | WorkflowExecuteAsyncStep;
    const { 'workflow-id': workflowId, inputs = {} } = step.with;
    // Determine if we should await based on step type
    const shouldAwait = this.node.type === 'workflow.execute';

    try {
      const targetWorkflow = await this.getWorkflow(workflowId);
      if (!targetWorkflow) {
        const error = new Error(`Workflow not found: ${workflowId}`);
        this.stepExecutionRuntime.failStep(error);
        this.workflowExecutionRuntime.navigateToNextNode();
        await this.stepExecutionRuntime.flushEventLogs();
        return;
      }

      // Validate permissions and same-space
      try {
        await this.validateWorkflowAccess(targetWorkflow);
      } catch (error) {
        this.stepExecutionRuntime.failStep(error as Error);
        this.workflowExecutionRuntime.navigateToNextNode();
        await this.stepExecutionRuntime.flushEventLogs();
        return;
      }

      const mappedInputs = this.mapInputs(inputs);

      if (shouldAwait) {
        await this.syncExecutor.execute(targetWorkflow, mappedInputs, this.spaceId, this.request);
      } else {
        await this.asyncExecutor.execute(targetWorkflow, mappedInputs, this.spaceId, this.request);
      }
    } catch (error) {
      this.stepExecutionRuntime.failStep(error as Error);
      this.workflowExecutionRuntime.navigateToNextNode();
    } finally {
      await this.stepExecutionRuntime.flushEventLogs();
    }
  }

  private async getWorkflow(workflowId: string): Promise<EsWorkflow | null> {
    return this.workflowRepository.getWorkflow(workflowId, this.spaceId);
  }

  private async validateWorkflowAccess(workflow: EsWorkflow): Promise<void> {
    // Note: spaceId validation is already done by the repository when fetching the workflow
    // since getWorkflow filter by spaceId
    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflow.id} is disabled`);
    }
    if (!workflow.valid) {
      throw new Error(`Workflow ${workflow.id} is not valid`);
    }
  }

  private mapInputs(inputs: Record<string, unknown>): Record<string, unknown> {
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(inputs);
  }
}
