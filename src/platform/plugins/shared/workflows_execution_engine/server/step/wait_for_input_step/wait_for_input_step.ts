/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { WaitForInputGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/**
 * Implementation of the waitForInput step.
 *
 * This step pauses workflow execution until external input is provided via the resume API.
 * It supports:
 * - Optional timeout: If specified, the step will fail or provide a timeout output after the duration
 * - Input schema: Optional JSON schema defining expected input structure
 * - Message: Optional message to display to the user
 *
 * The step enters WAITING_FOR_INPUT status and waits for the resume API to be called with input data.
 * When resumed, the input is available in the step's output as `{{ steps.<step_name>.output.input }}`.
 */
export class WaitForInputStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    const config = this.node.configuration.with;

    if (this.stepExecutionRuntime.tryEnterWaitForInput(config?.timeout)) {
      this.workflowLogger.logDebug(
        `Waiting for human input in step ${this.node.id}${config?.timeout ? ` (timeout: ${config.timeout})` : ''}`
      );

      // Store additional metadata in step state for UI consumption
      const currentState = this.stepExecutionRuntime.getCurrentStepState() || {};
      this.stepExecutionRuntime.setCurrentStepState({
        ...currentState,
        inputSchema: config?.inputSchema,
        message: config?.message,
      });

      return;
    }

    // Human input received or timed out, continue execution
    this.exitWaitForInput();
  }

  private exitWaitForInput(): void {
    const currentState = this.stepExecutionRuntime.getCurrentStepState() || {};
    const humanInput = currentState.humanInput;
    const timedOut = currentState.timedOut;

    // Clean up wait-related state
    const cleanedState = { ...(currentState || {}) };
    delete cleanedState.humanInput;
    delete cleanedState.timedOut;
    delete cleanedState.waitingForInputSince;
    delete cleanedState.timeoutTaskId;
    delete cleanedState.inputSchema;
    delete cleanedState.message;

    this.stepExecutionRuntime.setCurrentStepState(
      Object.keys(cleanedState).length ? cleanedState : undefined
    );

    // Set output with the human input or timeout flag
    const output: Record<string, unknown> = {};
    if (timedOut) {
      output.timedOut = true;
      this.workflowLogger.logDebug(`Step ${this.node.id} timed out waiting for human input`);
    } else if (humanInput !== undefined) {
      output.input = humanInput;
      this.workflowLogger.logDebug(`Received human input for step ${this.node.id}`);
    }

    this.stepExecutionRuntime.finishStep(output);
    this.workflowRuntime.navigateToNextNode();
  }
}
