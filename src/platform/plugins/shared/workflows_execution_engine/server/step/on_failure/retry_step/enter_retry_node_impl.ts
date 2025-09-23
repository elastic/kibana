/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterRetryNode } from '@kbn/workflows/graph';
import type { StepErrorCatcher, NodeImplementation } from '../../node_implementation';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';
import { parseDuration } from '../../../utils';
import type { WorkflowTaskManager } from '../../../workflow_task_manager/workflow_task_manager';

export class EnterRetryNodeImpl implements NodeImplementation, StepErrorCatcher {
  private static readonly SHORT_DELAY_THRESHOLD = 1000 * 5; // 5 seconds

  constructor(
    private node: EnterRetryNode,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowTaskManager: WorkflowTaskManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    if (!this.workflowRuntime.getCurrentStepState()) {
      // If retry state exists, it means we are re-entering the retry step
      await this.initializeRetry();
      return;
    }
    await this.advanceRetryAttempt();
  }

  public async catchError(): Promise<void> {
    const retryState = this.workflowRuntime.getCurrentStepState()!;

    if (retryState.attempt < this.node.configuration['max-attempts']) {
      // If the retry attempt is within the allowed limit, re-enter the retry step
      // Call setWorkflowError with undefined to exit catchError loop and continue execution
      this.workflowRuntime.navigateToNode(this.node.id);
      const delayInMs = this.node.configuration.delay
        ? parseDuration(this.node.configuration.delay)
        : 0;

      if (delayInMs > 0) {
        await this.applyDelay(delayInMs);
        return;
      }

      this.workflowRuntime.setWorkflowError(undefined);
      return;
    }

    await this.workflowRuntime.failStep(
      new Error(`Retry step "${this.node.stepId}" has exceeded the maximum number of attempts.`)
    );
  }

  private async initializeRetry(): Promise<void> {
    // Enter whole retry step scope
    await this.workflowRuntime.startStep();
    // Enter first attempt scope. Since attempt is 0 based, we add 1 to it.
    await this.workflowRuntime.setCurrentStepState({
      attempt: 0,
    });
    // Enter a new scope for the new attempt. Since attempt is 0 based, we add 1 to it.
    this.workflowRuntime.enterScope('1-attempt');
    this.workflowRuntime.navigateToNextNode();
  }

  private async advanceRetryAttempt(): Promise<void> {
    const retryState = this.workflowRuntime.getCurrentStepState()!;
    const attempt = retryState.attempt + 1;
    this.workflowLogger.logDebug(`Retrying "${this.node.stepId}" step. (attempt ${attempt}).`);
    await this.workflowRuntime.setCurrentStepState({ attempt });
    // Enter a new scope for the new attempt. Since attempt is 0 based, we add 1 to it.
    this.workflowRuntime.enterScope(`${attempt + 1}-attempt`);
    this.workflowRuntime.navigateToNextNode();
  }

  private async applyDelay(delayInMs: number): Promise<void> {
    if (delayInMs <= EnterRetryNodeImpl.SHORT_DELAY_THRESHOLD) {
      await this.handleShortDelay(delayInMs);
      return;
    }

    await this.handleLongDelay(delayInMs);
  }

  private async handleShortDelay(delay: number): Promise<void> {
    this.workflowLogger.logDebug(
      `Waiting for ${this.node.configuration.delay} before next attempt.`
    );
    this.workflowRuntime.setWorkflowError(undefined);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async handleLongDelay(delayMs: number): Promise<void> {
    const stepState = this.workflowRuntime.getCurrentStepState() || {};
    await this.workflowRuntime.setWaitStep();
    const workflowExecution = this.workflowRuntime.getWorkflowExecution();
    const runAt = new Date(new Date().getTime() + delayMs);
    const resumeExecutionTask = await this.workflowTaskManager.scheduleResumeTask({
      runAt,
      workflowRunId: workflowExecution.id,
      spaceId: workflowExecution.spaceId,
    });
    this.workflowLogger.logDebug(
      `Scheduled resume execution task with ID "${resumeExecutionTask.taskId}" for ${
        stepState.attempt
      } attempt in step "${this.node.id}".\nExecution will resume at ${runAt.toISOString()}`
    );
    await this.workflowRuntime.setCurrentStepState({
      ...stepState,
      resumeExecutionTaskId: resumeExecutionTask.taskId,
    });
    this.workflowRuntime.setWorkflowError(undefined);
  }
}
