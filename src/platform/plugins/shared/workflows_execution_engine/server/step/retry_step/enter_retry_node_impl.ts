/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterRetryNode } from '@kbn/workflows';
import type { StepErrorCatcher, StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import { parseDuration } from '../../utils';
import type { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';

export class EnterRetryNodeImpl implements StepImplementation, StepErrorCatcher {
  private static readonly SHORT_DELAY_THRESHOLD = 1000 * 5; // 5 seconds

  constructor(
    private node: EnterRetryNode,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowTaskManager: WorkflowTaskManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.workflowRuntime.enterScope();

    if (!this.workflowRuntime.getStepState(this.node.id)) {
      // If retry state exists, it means we are re-entering the retry step
      await this.initializeRetry();
      return;
    }
    await this.advanceRetryAttempt();
  }

  public async catchError(): Promise<void> {
    const retryState = this.workflowRuntime.getStepState(this.node.id)!;

    if (retryState.attempt < this.node.configuration['max-attempts']) {
      // If the retry attempt is within the allowed limit, re-enter the retry step
      // Call setWorkflowError with undefined to exit catchError loop and continue execution
      this.workflowRuntime.goToStep(this.node.id);
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
      this.node.id,
      new Error(`Retry step "${this.node.id}" has exceeded the maximum number of attempts.`)
    );
  }

  private async initializeRetry(): Promise<void> {
    await this.workflowRuntime.startStep(this.node.id);
    await this.workflowRuntime.setStepState(this.node.id, {
      attempt: 0,
    });
    this.workflowRuntime.goToNextStep();
  }

  private async advanceRetryAttempt(): Promise<void> {
    const retryState = this.workflowRuntime.getStepState(this.node.id)!;
    const attempt = retryState.attempt + 1;
    this.workflowLogger.logDebug(`Retrying "${this.node.id}" step. (attempt ${attempt}).`);
    await this.workflowRuntime.setStepState(this.node.id, { attempt });
    this.workflowRuntime.goToNextStep();
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
    const stepState = this.workflowRuntime.getStepState(this.node.id) || {};
    await this.workflowRuntime.setWaitStep(this.node.id);
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
    await this.workflowRuntime.setStepState(this.node.id, {
      ...stepState,
      resumeExecutionTaskId: resumeExecutionTask.taskId,
    });
    this.workflowRuntime.setWorkflowError(undefined);
  }
}
