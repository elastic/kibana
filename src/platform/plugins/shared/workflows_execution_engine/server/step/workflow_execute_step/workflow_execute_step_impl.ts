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

  private get node(): WorkflowExecuteGraphNode {
    return this.init.node;
  }

  private get stepExecutionRuntime(): StepExecutionRuntime {
    return this.init.stepExecutionRuntime;
  }

  private get workflowExecutionRuntime(): WorkflowExecutionRuntimeManager {
    return this.init.workflowExecutionRuntime;
  }

  private get workflowRepository(): WorkflowRepository {
    return this.init.workflowRepository;
  }

  private get spaceId(): string {
    return this.init.spaceId;
  }

  private get request(): KibanaRequest {
    return this.init.request;
  }

  async run(): Promise<void> {
    // Start step execution to ensure stepType and stepId are set
    // This is important for frontend rendering even if the step fails early
    this.stepExecutionRuntime.startStep();
    await this.stepExecutionRuntime.flushEventLogs();

    const step = this.node.configuration as WorkflowExecuteStep;
    const renderedWith = this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
      step.with || {}
    ) as Record<string, unknown>;
    const { 'workflow-id': workflowId, inputs = {} } = renderedWith;
    const mappedInputs =
      typeof inputs === 'object' && inputs !== null ? (inputs as Record<string, unknown>) : {};

    try {
      const currentDepth =
        ((this.stepExecutionRuntime.workflowExecution.context?.parentDepth as number | undefined) ??
          -1) + 1;
      if (currentDepth >= MAX_WORKFLOW_DEPTH) {
        const error = new Error(
          `Workflow composition depth limit (${MAX_WORKFLOW_DEPTH}) exceeded. Refactor to reduce nesting.`
        );
        this.stepExecutionRuntime.failStep(error);
        this.workflowExecutionRuntime.navigateToNextNode();
        await this.stepExecutionRuntime.flushEventLogs();
        return;
      }

      const targetWorkflow = await this.getWorkflow(String(workflowId));
      if (!targetWorkflow) {
        const error = new Error(`Workflow not found: ${workflowId}`);
        this.stepExecutionRuntime.failStep(error);
        this.workflowExecutionRuntime.navigateToNextNode();
        await this.stepExecutionRuntime.flushEventLogs();
        return;
      }

      try {
        await this.ensureWorkflowIsExecutable(targetWorkflow);
      } catch (error) {
        this.stepExecutionRuntime.failStep(error as Error);
        this.workflowExecutionRuntime.navigateToNextNode();
        await this.stepExecutionRuntime.flushEventLogs();
        return;
      }

      const result = await this.syncExecutor.execute(
        targetWorkflow,
        mappedInputs as Record<string, unknown>,
        this.spaceId,
        this.request,
        currentDepth
      );

      if (result.status === 'completed') {
        this.stepExecutionRuntime.finishStep(result.output);
        this.workflowExecutionRuntime.navigateToNextNode();
      } else if (result.status === 'failed') {
        this.stepExecutionRuntime.failStep(result.error as Error);
        this.workflowExecutionRuntime.navigateToNextNode();
      }
      // result.status === 'waiting': delay entered, no navigation
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

  private async ensureWorkflowIsExecutable(workflow: EsWorkflow): Promise<void> {
    // Note: spaceId validation is already done by the repository when fetching the workflow
    // since getWorkflow filter by spaceId
    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflow.id} is disabled`);
    }
    if (!workflow.valid) {
      throw new Error(`Workflow ${workflow.id} is not valid`);
    }
  }
}
