/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedError } from '@kbn/workflows';
import type { EnterRetryNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { NodeImplementation, NodeWithErrorCatching } from '../../node_implementation';

export class EnterRetryNodeImpl implements NodeImplementation, NodeWithErrorCatching {
  constructor(
    private node: EnterRetryNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public run(): void {
    if (!this.stepExecutionRuntime.getCurrentStepState()) {
      // If retry state exists, it means we are re-entering the retry step
      this.initializeRetry();
      return;
    }
    this.advanceRetryAttempt();
  }

  public catchError(failedContext: StepExecutionRuntime): void {
    const shouldRetry = failedContext.contextManager.evaluateBooleanExpressionInContext(
      this.node.configuration.condition || true,
      {
        error: failedContext.getCurrentStepResult()?.error,
      }
    );

    if (!shouldRetry) {
      this.workflowLogger.logDebug(`Condition for retry step not met, propagating error.`);
      return;
    }

    const attempt = this.stepExecutionRuntime.getCurrentStepState()?.attempt ?? 0;

    if (attempt < this.node.configuration['max-attempts']) {
      // If the retry attempt is within the allowed limit, re-enter the retry step
      // Call setWorkflowError with undefined to exit catchError loop and continue execution
      this.workflowRuntime.navigateToNode(this.node.id);
      this.workflowRuntime.setWorkflowError(undefined);
      return;
    }

    if (!failedContext.stepExecution?.error) {
      // it should not happen that we are in catchError without an error, but just in case
      this.stepExecutionRuntime.failStep(new Error('Retry step reached max attempts'));
      return;
    }

    // fail retry with last error after exceeding max attempts
    this.stepExecutionRuntime.failStep(
      new ExecutionError(failedContext.getCurrentStepResult()?.error as SerializedError)
    );
  }

  private initializeRetry(): void {
    // Enter whole retry step scope
    this.stepExecutionRuntime.startStep();
    // Enter first attempt scope. Since attempt is 0 based, we add 1 to it.
    this.stepExecutionRuntime.setCurrentStepState({
      attempt: 0,
    });
    // Enter a new scope for the new attempt. Since attempt is 0 based, we add 1 to it.
    this.workflowRuntime.enterScope('1-attempt');
    this.workflowRuntime.navigateToNextNode();
  }

  private advanceRetryAttempt(): void {
    if (
      this.node.configuration.delay &&
      this.stepExecutionRuntime.tryEnterDelay(this.node.configuration.delay)
    ) {
      this.workflowLogger.logDebug(`Delaying retry for ${this.node.configuration.delay}.`);
      // Enter a new scope for the new attempt. Since attempt is 0 based, we add 1 to it.
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const retryState = this.stepExecutionRuntime.getCurrentStepState()!;
    const attempt = retryState.attempt + 1;
    this.workflowLogger.logDebug(`Retrying "${this.node.stepId}" step. (attempt ${attempt}).`);
    this.stepExecutionRuntime.setCurrentStepState({ ...retryState, attempt });
    this.workflowRuntime.enterScope(`${attempt + 1}-attempt`);
    this.workflowRuntime.navigateToNextNode();
  }
}
