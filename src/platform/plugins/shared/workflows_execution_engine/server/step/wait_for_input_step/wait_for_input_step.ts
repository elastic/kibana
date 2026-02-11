/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitForInputGraphNode } from '@kbn/workflows/graph/types';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/**
 * Implementation of the waitForInput step.
 *
 * This step pauses workflow execution and waits for external input via the Resume API.
 *
 * ## Behavior:
 * - First execution: Puts the step in WAITING status indefinitely (far future date)
 * - Subsequent execution (after resume): Retrieves input from context and completes
 *
 * ## Input:
 * The resume API must provide input that will be stored in workflow context as `resumeInput`.
 *
 * ## Output:
 * Returns the input object provided during resume as the step's output.
 */
export class WaitForInputStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    // Check if we're resuming (input already provided via resume API)
    const resumeInput = this.workflowRuntime.getWorkflowExecution().context?.resumeInput;

    if (resumeInput !== undefined) {
      // We're resuming - complete the step with the provided input
      this.workflowLogger.logInfo(
        `Resume input received for step ${this.node.stepId}, continuing execution`
      );

      this.stepExecutionRuntime.finishStep(resumeInput);
      this.workflowRuntime.navigateToNextNode();
      return;
    }

    // First time executing - enter waiting state
    const message = this.node.configuration.with?.message || 'Waiting for user input';

    // Use a far future date to wait indefinitely (100 years from now)
    const farFutureDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

    if (this.stepExecutionRuntime.tryEnterWaitUntil(farFutureDate)) {
      this.workflowLogger.logInfo(`Step ${this.node.stepId} waiting for input: ${message}`);
      return;
    }

    // This should not happen in normal flow
    this.workflowLogger.logWarn(
      `waitForInput step did not enter waiting state as expected for step ${this.node.stepId}`
    );
  }
}
