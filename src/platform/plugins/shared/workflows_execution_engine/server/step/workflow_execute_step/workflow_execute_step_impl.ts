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
import { MAX_WORKFLOW_DEPTH } from './constants';
import { WorkflowExecuteSyncStrategy } from './strategies/workflow_execute_sync_strategy';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../types';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export interface WorkflowExecuteStepImplInit {
  node: WorkflowExecuteGraphNode;
  stepExecutionRuntime: StepExecutionRuntime;
  workflowExecutionRuntime: WorkflowExecutionRuntimeManager;
  workflowRepository: WorkflowRepository;
  spaceId: string;
  request: KibanaRequest;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  workflowLogger: IWorkflowEventLogger;
}

export class WorkflowExecuteStepImpl implements NodeImplementation {
  private syncExecutor: WorkflowExecuteSyncStrategy;

  constructor(private readonly init: WorkflowExecuteStepImplInit) {
    const {
      node: _node,
      stepExecutionRuntime,
      workflowsExecutionEngine,
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowLogger,
    } = init;
    this.syncExecutor = new WorkflowExecuteSyncStrategy(
      workflowsExecutionEngine,
      workflowExecutionRepository,
      stepExecutionRepository,
      stepExecutionRuntime,
      workflowLogger
    );
  }

  private getInput(): { workflowId: string; inputs: Record<string, unknown> } {
    const step = this.init.node.configuration as WorkflowExecuteStep;
    const renderedWith =
      this.init.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
        step.with || {}
      ) as Record<string, unknown>;
    const { 'workflow-id': workflowId, inputs = {} } = renderedWith;
    const mappedInputs =
      typeof inputs === 'object' && inputs !== null ? (inputs as Record<string, unknown>) : {};
    return { workflowId: String(workflowId), inputs: mappedInputs };
  }

  async run(): Promise<void> {
    const { node, stepExecutionRuntime, workflowExecutionRuntime } = this.init;

    // Start step execution to ensure stepType and stepId are set
    // This is important for frontend rendering even if the step fails early
    stepExecutionRuntime.startStep();

    const { workflowId, inputs } = this.getInput();

    // Persist resolved inputs for observability in the execution UI
    stepExecutionRuntime.setInput({ 'workflow-id': workflowId, inputs });
    await stepExecutionRuntime.flushEventLogs();

    try {
      const rawDepth = stepExecutionRuntime.workflowExecution.context?.parentDepth;
      const currentDepth = (typeof rawDepth === 'number' ? rawDepth : -1) + 1;
      if (currentDepth >= MAX_WORKFLOW_DEPTH) {
        const error = new Error(
          `Workflow composition depth limit (${MAX_WORKFLOW_DEPTH}) exceeded at step "${node.stepId}" in workflow "${stepExecutionRuntime.workflowExecution.workflowId}". Refactor to reduce nesting.`
        );
        stepExecutionRuntime.failStep(error);
        workflowExecutionRuntime.navigateToNextNode();
        await stepExecutionRuntime.flushEventLogs();
        return;
      }

      const targetWorkflow = await this.getWorkflow(workflowId);
      if (!targetWorkflow) {
        const error = new Error(
          `Workflow not found: "${workflowId}" (referenced by step "${node.stepId}" in workflow "${stepExecutionRuntime.workflowExecution.workflowId}")`
        );
        stepExecutionRuntime.failStep(error);
        workflowExecutionRuntime.navigateToNextNode();
        await stepExecutionRuntime.flushEventLogs();
        return;
      }

      try {
        await this.ensureWorkflowIsExecutable(targetWorkflow);
      } catch (error) {
        stepExecutionRuntime.failStep(error as Error);
        workflowExecutionRuntime.navigateToNextNode();
        await stepExecutionRuntime.flushEventLogs();
        return;
      }

      const result = await this.syncExecutor.execute(
        targetWorkflow,
        inputs,
        this.init.spaceId,
        this.init.request,
        currentDepth
      );

      if (result.status === 'completed') {
        stepExecutionRuntime.finishStep(result.output);
        workflowExecutionRuntime.navigateToNextNode();
      } else if (result.status === 'failed') {
        stepExecutionRuntime.failStep(result.error as Error);
        workflowExecutionRuntime.navigateToNextNode();
      }
      // result.status === 'waiting': delay entered, no navigation
    } catch (error) {
      stepExecutionRuntime.failStep(error as Error);
      workflowExecutionRuntime.navigateToNextNode();
    } finally {
      await stepExecutionRuntime.flushEventLogs();
    }
  }

  private async getWorkflow(workflowId: string): Promise<EsWorkflow | null> {
    return this.init.workflowRepository.getWorkflow(workflowId, this.init.spaceId);
  }

  private async ensureWorkflowIsExecutable(workflow: EsWorkflow): Promise<void> {
    const { node, stepExecutionRuntime } = this.init;
    // Note: spaceId validation is already done by the repository when fetching the workflow
    // since getWorkflow filter by spaceId
    if (!workflow.enabled) {
      throw new Error(
        `Workflow "${workflow.id}" is disabled (referenced by step "${node.stepId}" in workflow "${stepExecutionRuntime.workflowExecution.workflowId}")`
      );
    }
    if (!workflow.valid) {
      throw new Error(
        `Workflow "${workflow.id}" is not valid (referenced by step "${node.stepId}" in workflow "${stepExecutionRuntime.workflowExecution.workflowId}")`
      );
    }
  }
}
