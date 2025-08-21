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

export class EnterRetryNodeImpl implements StepImplementation, StepErrorCatcher {
  constructor(
    private step: EnterRetryNode,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.workflowRuntime.enterScope();

    if (!this.workflowRuntime.getStepState(this.step.id)) {
      // If retry state exists, it means we are re-entering the retry step
      await this.initializeRetry();
      return;
    }
    await this.advanceRetryAttempt();
  }

  private async initializeRetry(): Promise<void> {
    await this.workflowRuntime.startStep(this.step.id);
    await this.workflowRuntime.setStepState(this.step.id, {
      attempt: 1,
    });
    this.workflowRuntime.goToNextStep();
  }

  private async advanceRetryAttempt(): Promise<void> {
    const retryState = this.workflowRuntime.getStepState(this.step.id)!;
    const attempt = retryState.attempt + 1;
    this.workflowLogger.logDebug(
      `Child step. Retrying the chain of steps for retry step "${this.step.id}" (attempt ${attempt}).`
    );

    // TODO: Implement delay logic between retries
    // It must work similar way as WaitStepImpl

    await this.workflowRuntime.setStepState(this.step.id, { attempt });
    this.workflowRuntime.goToNextStep();
  }

  public async catchError(): Promise<void> {
    const retryState = this.workflowRuntime.getStepState(this.step.id)!;

    if (retryState.attempt <= this.step.configuration['max-attempts']) {
      // If the retry attempt is within the allowed limit, re-enter the retry step
      // Call setWorkflowError with undefined to exit catchError loop and continue execution
      this.workflowRuntime.setWorkflowError(undefined);
      this.workflowRuntime.goToStep(this.step.id);
      return;
    }

    await this.workflowRuntime.failStep(
      this.step.id,
      new Error(`Retry step "${this.step.id}" has exceeded the maximum number of attempts.`)
    );
  }
}
