/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowOutputStep } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowOutputGraphNode } from '@kbn/workflows/graph';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/**
 * Implements the workflow.output step which emits outputs and terminates workflow execution.
 *
 * When this step executes:
 * 1. Validates the output values against the workflow's declared output schema (if any)
 * 2. Sets the workflow outputs in the execution context
 * 3. Terminates the workflow with the specified status (completed/cancelled/failed)
 * 4. Prevents any subsequent steps from executing by clearing the next node
 */
export class WorkflowOutputStepImpl implements NodeImplementation {
  constructor(
    private node: WorkflowOutputGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory
  ) {}

  /**
   * Completes all ancestor steps in the scope stack.
   * Uses the step's own finishStep() logic so lifecycle behaviour
   * (logging, timing, status) is applied consistently.
   */
  private completeAncestorSteps(): void {
    let stack = this.stepExecutionRuntime.scopeStack;
    while (!stack.isEmpty()) {
      const currentScope = stack.getCurrentScope();
      stack = stack.exitScope();
      const scopeStepRuntime = this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
        nodeId: currentScope.nodeId,
        stackFrames: stack.stackFrames,
      });
      if (scopeStepRuntime.stepExecutionExists()) {
        scopeStepRuntime.finishStep();
      }
    }
  }

  async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    await this.stepExecutionRuntime.flushEventLogs();

    const step = this.node.configuration as WorkflowOutputStep;
    // Render template variables in the output values (with: may be omitted for workflow.fail)
    const outputValues = step.with
      ? (this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
          step.with
        ) as Record<string, unknown>)
      : {};

    try {
      // Get the workflow definition to check for declared outputs
      const workflowExecution = this.workflowExecutionRuntime.getWorkflowExecution();
      const declaredOutputs = workflowExecution.workflowDefinition?.outputs;

      const normalizedOutputs = normalizeFieldsToJsonSchema(declaredOutputs);

      if (normalizedOutputs?.properties && Object.keys(normalizedOutputs.properties).length > 0) {
        const validator = buildFieldsZodValidator(normalizedOutputs);
        const validationResult = validator.safeParse(outputValues);

        if (!validationResult.success) {
          const errorMessages = validationResult.error.issues
            .map((issue) => {
              const fieldName = (issue.path[0] as string) || '';
              return `${fieldName}: ${issue.message}`;
            })
            .join(', ');
          const errorMessage = `Output validation failed: ${errorMessages}`;
          const validationError = new Error(errorMessage);

          this.workflowLogger.logError(errorMessage, validationError, {
            event: { action: 'workflow-output-validation-failed', outcome: 'failure' },
            tags: ['workflow-output', 'validation-error'],
          });

          // Fail the step with validation error (failStep also sets workflow-level error via updateWorkflowExecution)
          this.stepExecutionRuntime.failStep(validationError);
          await this.stepExecutionRuntime.flushEventLogs();

          this.workflowExecutionRuntime.setWorkflowStatus(ExecutionStatus.FAILED);
          return;
        }
      }

      this.workflowLogger.logInfo('Workflow outputs emitted successfully', {
        event: { action: 'workflow-output-emitted', outcome: 'success' },
        tags: ['workflow-output', 'success'],
      });

      // Execution status from step (default 'completed' is applied by WorkflowOutputStepSchema)
      const stepStatus = step.status;
      let executionStatus: ExecutionStatus;
      let outcome: 'success' | 'failure' | 'unknown';

      // Store outputs in workflow execution context and persist them
      // This ensures outputs are saved before the workflow terminates
      this.workflowExecutionRuntime.setWorkflowOutputs(outputValues);

      switch (stepStatus) {
        case 'completed':
          executionStatus = ExecutionStatus.COMPLETED;
          outcome = 'success';
          // Complete the step successfully with the output values
          this.stepExecutionRuntime.finishStep(outputValues);
          break;
        case 'cancelled': {
          executionStatus = ExecutionStatus.CANCELLED;
          outcome = 'unknown';
          // User can provide reason/message in with:; otherwise default mentions the step
          const stepName = this.node.configuration?.name ?? 'workflow.output';
          const cancellationReason =
            (typeof outputValues.reason === 'string' && outputValues.reason) ||
            (typeof outputValues.message === 'string' && outputValues.message) ||
            `Cancelled by step '${stepName}'`;
          this.workflowExecutionRuntime.setWorkflowCancelled(cancellationReason);
          this.stepExecutionRuntime.finishStep(outputValues);
          break;
        }
        case 'failed': {
          executionStatus = ExecutionStatus.FAILED;
          outcome = 'failure';
          const errorMessage =
            (typeof outputValues.message === 'string' && outputValues.message) ||
            (typeof outputValues.reason === 'string' && outputValues.reason) ||
            'Workflow terminated with failed status';

          const failureError = new Error(errorMessage);

          this.workflowLogger.logInfo(`Workflow failed with message: ${errorMessage}`, {
            event: { action: 'workflow-output-error-set', outcome: 'failure' },
            tags: ['workflow-output', 'error'],
            error: {
              message: errorMessage,
              type: failureError.name,
            },
          });

          // The step itself completes successfully (it did its job),
          // but the workflow is marked as failed via setWorkflowError
          this.stepExecutionRuntime.finishStep(outputValues);
          this.workflowExecutionRuntime.setWorkflowError(failureError);
          break;
        }
        default:
          executionStatus = ExecutionStatus.COMPLETED;
          outcome = 'success';
          this.stepExecutionRuntime.finishStep(outputValues);
      }

      await this.stepExecutionRuntime.flushEventLogs();

      this.workflowLogger.logInfo(`Workflow terminated with status: ${stepStatus}`, {
        event: {
          action: 'workflow-terminated',
          outcome,
        },
        tags: ['workflow-output', 'termination'],
      });

      this.completeAncestorSteps();

      // Update the workflow execution status to terminate the workflow (cancelled already set via setWorkflowCancelled)
      if (executionStatus !== ExecutionStatus.CANCELLED) {
        this.workflowExecutionRuntime.setWorkflowStatus(executionStatus);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorObj = error instanceof Error ? error : new Error(errorMessage);

      this.workflowLogger.logError(`Workflow output step failed: ${errorMessage}`, errorObj, {
        event: { action: 'workflow-output-failed', outcome: 'failure' },
        tags: ['workflow-output', 'error'],
      });

      // failStep() sets workflow-level error via updateWorkflowExecution({ error })
      this.stepExecutionRuntime.failStep(errorObj);
      await this.stepExecutionRuntime.flushEventLogs();

      this.workflowExecutionRuntime.setWorkflowStatus(ExecutionStatus.FAILED);
    }
  }
}
