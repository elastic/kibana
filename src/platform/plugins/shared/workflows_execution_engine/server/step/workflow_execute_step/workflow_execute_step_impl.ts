/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow, WorkflowExecuteStep, WorkflowRepository } from '@kbn/workflows';
import type { WorkflowExecuteGraphNode } from '@kbn/workflows/graph';
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
    private node: WorkflowExecuteGraphNode,
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

    const step = this.node.configuration as WorkflowExecuteStep;
    const { workflow, inputs = {}, await: shouldAwait = true } = step.with;

    try {
      // Resolve workflow by ID or name
      const targetWorkflow = await this.resolveWorkflow(workflow);
      if (!targetWorkflow) {
        const error = new Error(`Workflow not found: ${JSON.stringify(workflow)}`);
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

      // Map inputs using template engine
      const mappedInputs = this.mapInputs(inputs);

      // Route to appropriate execution strategy
      if (shouldAwait) {
        await this.syncExecutor.execute(targetWorkflow, mappedInputs, this.spaceId, this.request);
      } else {
        await this.asyncExecutor.execute(targetWorkflow, mappedInputs, this.spaceId, this.request);
      }
    } catch (error) {
      // Catch any unexpected errors during execution
      this.stepExecutionRuntime.failStep(error as Error);
      this.workflowExecutionRuntime.navigateToNextNode();
    } finally {
      await this.stepExecutionRuntime.flushEventLogs();
    }
  }

  private async resolveWorkflow(workflowRef: {
    id?: string;
    name?: string;
  }): Promise<EsWorkflow | null> {
    if (workflowRef.id) {
      return this.workflowRepository.getWorkflow(workflowRef.id, this.spaceId);
    }
    if (workflowRef.name) {
      return this.workflowRepository.findWorkflowByName(workflowRef.name, this.spaceId);
    }
    return null;
  }

  private async validateWorkflowAccess(workflow: EsWorkflow): Promise<void> {
    // Note: spaceId validation is already done by the repository when fetching the workflow
    // since getWorkflow and findWorkflowByName filter by spaceId
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
