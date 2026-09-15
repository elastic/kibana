/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus, toWorkflowExecutionEngineModel } from '@kbn/workflows';
import { readChildExecutionOutcome } from '../../../lib/read_child_execution_outcome';
import type { StepExecutionRepository } from '../../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { StrategyResult } from '../types';

export type { StrategyResult } from '../types';

interface SubWorkflowWaitState extends Record<string, unknown> {
  workflowId: string;
  executionId: string;
  startedAt: string;
}

export class WorkflowExecuteSyncStrategy {
  constructor(
    private workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private stepExecutionRepository: StepExecutionRepository,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async execute(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest,
    parentDepth: number
  ): Promise<StrategyResult> {
    const currentState = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;

    if (!currentState) {
      return this.initiateSubWorkflowExecution(workflow, inputs, spaceId, request, parentDepth);
    }

    return this.readChildExecutionFromEs(currentState, spaceId);
  }

  /** True when wait state exists (e.g. after entering WAITING_FOR_CHILD). */
  canResume(): boolean {
    const state = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;
    return !!state?.executionId;
  }

  /** Child execution id when waiting on a sub-workflow (for onCancel). */
  getExecutionIdForCancel(): string | undefined {
    const state = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;
    return state?.executionId;
  }

  /** Re-read child execution from ES after child completion resumed the parent. */
  async resume(spaceId: string): Promise<StrategyResult> {
    const currentState = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;

    if (!currentState?.executionId) {
      return {
        status: 'failed',
        error: new Error('Cannot resume workflow.execute step without existing wait state'),
      };
    }

    return this.readChildExecutionFromEs(currentState, spaceId);
  }

  private async initiateSubWorkflowExecution(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest,
    parentDepth: number
  ): Promise<StrategyResult> {
    try {
      const workflowExecution = this.stepExecutionRuntime.workflowExecution;
      const isTestRun = !!this.stepExecutionRuntime.workflowExecution.isTestRun;
      const { workflowExecutionId } = await this.workflowsExecutionEngine.executeWorkflow(
        toWorkflowExecutionEngineModel(workflow, { isTestRun }),
        {
          spaceId,
          inputs,
          triggeredBy: 'workflow-step',
          parentWorkflowInvocation: 'sync',
          parentWorkflowId: workflowExecution.workflowId,
          parentWorkflowExecutionId: workflowExecution.id,
          parentStepId: this.stepExecutionRuntime.node.stepId,
          parentDepth,
        },
        request
      );

      this.workflowLogger.logInfo(
        `Started sync sub-workflow execution: ${workflowExecutionId}, entering wait state`
      );

      const state: SubWorkflowWaitState = {
        workflowId: workflow.id,
        executionId: workflowExecutionId,
        startedAt: new Date().toISOString(),
      };

      this.stepExecutionRuntime.setCurrentStepState(state);

      if (this.stepExecutionRuntime.abortController.signal.aborted) {
        return { status: 'cancelled' };
      }

      this.stepExecutionRuntime.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_CHILD);
      return { status: 'waiting' };
    } catch (error) {
      return { status: 'failed', error: error as Error };
    }
  }

  private async readChildExecutionFromEs(
    state: SubWorkflowWaitState,
    spaceId: string
  ): Promise<StrategyResult> {
    try {
      const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
        state.executionId,
        spaceId
      );

      if (!execution) {
        return {
          status: 'failed',
          error: new Error(`Sub-workflow execution ${state.executionId} not found`),
        };
      }

      if (!isTerminalStatus(execution.status)) {
        // Child still running (e.g. parent idle-timeout task fired before child finished).
        // Stay in WAITING_FOR_CHILD so workflow timeout zones can run; do not fail the parent step.
        return { status: 'waiting' };
      }

      return readChildExecutionOutcome({
        execution,
        stepExecutionRepository: this.stepExecutionRepository,
        logger: this.workflowLogger,
      });
    } catch (error) {
      return { status: 'failed', error: error as Error };
    }
  }
}
