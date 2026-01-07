/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowOutput, WorkflowOutputStep } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowOutputGraphNode } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/**
 * Creates a Zod validator for workflow outputs
 */
function makeOutputValidator(outputs: WorkflowOutput[]) {
  return z.object(
    outputs.reduce((acc, output) => {
      switch (output.type) {
        case 'string':
          acc[output.name] = output.required ? z.string() : z.string().optional();
          break;
        case 'number':
          acc[output.name] = output.required ? z.number() : z.number().optional();
          break;
        case 'boolean':
          acc[output.name] = output.required ? z.boolean() : z.boolean().optional();
          break;
        case 'choice':
          acc[output.name] = output.required
            ? z.enum(output.options as [string, ...string[]])
            : z.enum(output.options as [string, ...string[]]).optional();
          break;
        case 'array': {
          const arraySchemas = [z.array(z.string()), z.array(z.number()), z.array(z.boolean())];
          const { minItems, maxItems } = output;
          const applyConstraints = (
            schema: z.ZodArray<z.ZodString | z.ZodNumber | z.ZodBoolean>
          ) => {
            let s = schema;
            if (minItems != null) s = s.min(minItems);
            if (maxItems != null) s = s.max(maxItems);
            return s;
          };
          const arr = z.union(
            arraySchemas.map(applyConstraints) as [
              z.ZodArray<z.ZodString>,
              z.ZodArray<z.ZodNumber>,
              z.ZodArray<z.ZodBoolean>
            ]
          );
          acc[output.name] = output.required ? arr : arr.optional();
          break;
        }
      }
      return acc;
    }, {} as Record<string, z.ZodType>)
  );
}

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
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    await this.stepExecutionRuntime.flushEventLogs();

    const step = this.node.configuration as WorkflowOutputStep;
    // Render template variables in the output values
    const outputValues = this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
      step.with
    ) as Record<string, unknown>;

    try {
      // Get the workflow definition to check for declared outputs
      const workflowExecution = this.workflowExecutionRuntime.getWorkflowExecution();
      const declaredOutputs = workflowExecution.workflowDefinition?.outputs as
        | WorkflowOutput[]
        | undefined;

      // Validate outputs against declared schema if it exists
      if (declaredOutputs && declaredOutputs.length > 0) {
        const validator = makeOutputValidator(declaredOutputs);
        const validationResult = validator.safeParse(outputValues);

        if (!validationResult.success) {
          const errorMessages = validationResult.error.issues
            .map((issue: z.ZodIssue) => {
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

          // Fail the step with validation error
          this.stepExecutionRuntime.failStep(validationError);
          await this.stepExecutionRuntime.flushEventLogs();

          // Mark workflow as failed
          this.workflowExecutionRuntime.setWorkflowError(validationError);
          this.workflowExecutionRuntime.setWorkflowStatus(ExecutionStatus.FAILED);
          return;
        }
      }

      this.workflowLogger.logInfo('Workflow outputs emitted successfully', {
        event: { action: 'workflow-output-emitted', outcome: 'success' },
        tags: ['workflow-output', 'success'],
      });

      // Determine the execution status based on the step's status parameter
      const stepStatus = step.status || 'completed';
      let executionStatus: ExecutionStatus;
      let outcome: 'success' | 'failure' | 'unknown';

      // Store outputs in workflow execution context
      const currentContext = (workflowExecution.context as Record<string, unknown>) || {};
      currentContext.output = outputValues;
      workflowExecution.context = currentContext;

      switch (stepStatus) {
        case 'completed':
          executionStatus = ExecutionStatus.COMPLETED;
          outcome = 'success';
          // Complete the step successfully with the output values
          this.stepExecutionRuntime.finishStep(outputValues);
          break;
        case 'cancelled':
          executionStatus = ExecutionStatus.CANCELLED;
          outcome = 'unknown';
          // Complete the step successfully with the output values (cancellation is not an error)
          this.stepExecutionRuntime.finishStep(outputValues);
          break;
        case 'failed':
          executionStatus = ExecutionStatus.FAILED;
          outcome = 'failure';
          // For workflow.fail steps, use the message from the output if available
          const errorMessage =
            typeof outputValues.message === 'string'
              ? outputValues.message
              : 'Workflow terminated with failed status';

          const failureError = new Error(errorMessage);

          this.workflowLogger.logInfo(`Workflow failed with message: ${errorMessage}`, {
            event: { action: 'workflow-output-error-set', outcome: 'failure' },
            tags: ['workflow-output', 'error'],
            error: {
              message: errorMessage,
              type: failureError.name,
            },
          });

          // Fail the step with the error
          // Note: failStep() already sets the workflow error, so we don't need to call setWorkflowError() separately
          this.stepExecutionRuntime.failStep(failureError);
          break;
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

      // Update the workflow execution status to terminate the workflow
      // This will cause the execution loop to stop
      this.workflowExecutionRuntime.setWorkflowStatus(executionStatus);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorObj = error instanceof Error ? error : new Error(errorMessage);

      this.workflowLogger.logError(`Workflow output step failed: ${errorMessage}`, errorObj, {
        event: { action: 'workflow-output-failed', outcome: 'failure' },
        tags: ['workflow-output', 'error'],
      });

      this.stepExecutionRuntime.failStep(errorObj);
      await this.stepExecutionRuntime.flushEventLogs();

      // Mark workflow as failed
      this.workflowExecutionRuntime.setWorkflowError(errorObj);
      this.workflowExecutionRuntime.setWorkflowStatus(ExecutionStatus.FAILED);
    }
  }
}
