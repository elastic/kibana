/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { StepExecutionRepository } from '../../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import { ExecutionError } from '../../../utils/execution_error/execution_error';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { SUB_WORKFLOW_POLL_INTERVAL } from '../constants';

interface SubWorkflowWaitState {
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
    private workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async execute(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    const currentState = this.stepExecutionRuntime.getCurrentStepState() as
      | SubWorkflowWaitState
      | undefined;

    // First execution: Schedule sub-workflow and enter wait state
    if (!currentState) {
      await this.initiateSubWorkflowExecution(workflow, inputs, spaceId, request);
      return;
    }

    // Resume: Check sub-workflow status
    await this.checkSubWorkflowStatus(currentState, spaceId);
  }

  private async initiateSubWorkflowExecution(
    workflow: EsWorkflow,
    inputs: Record<string, unknown>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    this.stepExecutionRuntime.startStep();

    try {
      // Schedule sub-workflow execution
      const workflowExecution = this.stepExecutionRuntime.workflowExecution;
      const { workflowExecutionId } = await this.workflowsExecutionEngine.executeWorkflow(
        this.toExecutionModel(workflow),
        {
          spaceId,
          inputs,
          triggeredBy: 'workflow-step',
          parentWorkflowId: workflowExecution.workflowId,
          parentWorkflowExecutionId: workflowExecution.id,
          parentStepId: this.stepExecutionRuntime.node.stepId,
        },
        request
      );

      this.workflowLogger.logInfo(
        `Started sync sub-workflow execution: ${workflowExecutionId}, entering wait state`
      );

      // Save state with execution ID
      const state: SubWorkflowWaitState = {
        workflowId: workflow.id,
        executionId: workflowExecutionId,
        startedAt: new Date().toISOString(),
      };
      this.stepExecutionRuntime.setCurrentStepState(state);

      // Enter wait state - this will schedule a resume task after SUB_WORKFLOW_POLL_INTERVAL
      if (this.stepExecutionRuntime.tryEnterDelay(SUB_WORKFLOW_POLL_INTERVAL)) {
        this.workflowLogger.logDebug(
          `Entering wait state to poll sub-workflow ${workflowExecutionId} after ${SUB_WORKFLOW_POLL_INTERVAL}`
        );
        // Exit without navigating - workflow will be resumed by task manager
      }
    } catch (error) {
      this.stepExecutionRuntime.failStep(error as Error);
      this.workflowExecutionRuntime.navigateToNextNode();
    }
  }

  private async checkSubWorkflowStatus(
    state: SubWorkflowWaitState,
    spaceId: string
  ): Promise<void> {
    try {
      // Fetch sub-workflow execution status
      const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
        state.executionId,
        spaceId
      );

      if (!execution) {
        throw new Error(`Sub-workflow execution ${state.executionId} not found`);
      }

      // Check if execution is complete
      if (isTerminalStatus(execution.status)) {
        this.workflowLogger.logInfo(
          `Sub-workflow ${state.executionId} completed with status: ${execution.status}`
        );

        // Extract output - prioritize workflow.output step results from context
        let output: JsonValue;
        if (execution.context?.output) {
          // If the child workflow used workflow.output step, use that output
          output = execution.context.output as JsonValue;
          this.workflowLogger.logDebug(
            `Using workflow.output from child workflow execution ${state.executionId}`
          );
        } else {
          // Fallback: Extract output from step executions (legacy behavior)
          const stepExecutions =
            await this.stepExecutionRepository.searchStepExecutionsByExecutionId(state.executionId);
          // Convert EsWorkflowStepExecution to WorkflowStepExecutionDto (omit spaceId)
          const stepExecutionDtos: WorkflowStepExecutionDto[] = stepExecutions.map((exec) =>
            omit(exec, ['spaceId'])
          );
          output = this.getWorkflowOutput(stepExecutionDtos);
          this.workflowLogger.logDebug(
            `Using last step output from child workflow execution ${state.executionId}`
          );
        }

        // Check if sub-workflow failed before finishing the step
        if (execution.status === ExecutionStatus.FAILED) {
          let error: Error;
          if (execution.error) {
            // Create ExecutionError from the child's error
            // If message is empty, try to get it from context.output.message (workflow.fail pattern)
            if (!execution.error.message || execution.error.message.trim() === '') {
              const errorMessage =
                (execution.context?.output as Record<string, unknown>)?.message ||
                'Sub-workflow execution failed';

              error = new ExecutionError({
                type: execution.error.type || 'Error',
                message: typeof errorMessage === 'string' ? errorMessage : String(errorMessage),
                ...(execution.error.details && { details: execution.error.details }),
              });
            } else {
              error = new ExecutionError(execution.error);
            }
          } else {
            // No error object, but workflow failed - try to get message from context.output
            const errorMessage =
              (execution.context?.output as Record<string, unknown>)?.message ||
              'Sub-workflow execution failed';

            error = new ExecutionError({
              type: 'Error',
              message: typeof errorMessage === 'string' ? errorMessage : String(errorMessage),
            });
          }
          this.stepExecutionRuntime.failStep(error);
        } else {
          // Pass the output directly as the step output (not wrapped in an object)
          // This allows parent workflows to access child outputs via steps.<step-id>.output.field
          // Convert JsonValue to Record<string, unknown> | undefined for finishStep
          const stepOutput: Record<string, unknown> | undefined =
            output === null ? undefined : (output as Record<string, unknown>);
          this.stepExecutionRuntime.finishStep(stepOutput);
        }

        this.workflowExecutionRuntime.navigateToNextNode();
      } else {
        // Still running - enter wait state again to poll after interval
        this.workflowLogger.logDebug(
          `Sub-workflow ${state.executionId} still ${execution.status}, polling again after ${SUB_WORKFLOW_POLL_INTERVAL}`
        );

        if (this.stepExecutionRuntime.tryEnterDelay(SUB_WORKFLOW_POLL_INTERVAL)) {
          // Exit without navigating - workflow will be resumed by task manager
        }
      }
    } catch (error) {
      this.stepExecutionRuntime.failStep(error as Error);
      this.workflowExecutionRuntime.navigateToNextNode();
    }
  }

  private toExecutionModel(workflow: EsWorkflow): WorkflowExecutionEngineModel {
    return {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition,
      yaml: workflow.yaml,
      // Note: spaceId is not part of EsWorkflow type, but we have it from the context
      // The execution engine will use the spaceId from the execution context
      isTestRun: false,
    };
  }

  /**
   * Recursively extracts the output from a workflow execution's step executions.
   * At top-level (scopeDepth=0), finds the last step. At nested levels (scopeDepth>0),
   * considers all steps at that level. If steps have children, recurses into them.
   * Otherwise, returns their output(s).
   */
  private getWorkflowOutput(stepExecutions: WorkflowStepExecutionDto[]): JsonValue {
    if (stepExecutions.length === 0) {
      return null;
    }

    // workflow execution do not necessarily start at depth 0
    let minDepth = stepExecutions[0].scopeStack.length;
    for (let i = 1; i < stepExecutions.length; i++) {
      minDepth = Math.min(minDepth, stepExecutions[i].scopeStack.length);
    }

    return this.getWorkflowOutputRecursive(stepExecutions, minDepth, minDepth);
  }

  private getWorkflowOutputRecursive(
    stepExecutions: WorkflowStepExecutionDto[],
    scopeDepth: number,
    minDepth: number
  ): JsonValue {
    if (stepExecutions.length === 0) {
      return null;
    }

    // Filter for steps at the current scope depth
    const stepsAtThisLevel = stepExecutions.filter((step) => step.scopeStack.length === scopeDepth);
    if (stepsAtThisLevel.length === 0) {
      return null;
    }

    // At top-level (scopeDepth = minDepth), only consider the last step
    // At nested levels (scopeDepth > minDepth), consider all steps
    const stepsToProcess =
      scopeDepth === minDepth ? [stepsAtThisLevel[stepsAtThisLevel.length - 1]] : stepsAtThisLevel;

    // Find all children of the steps we're processing
    const children = stepExecutions.filter((step) => {
      if (step.scopeStack.length !== scopeDepth + 1) return false;
      const lastFrame = step.scopeStack[step.scopeStack.length - 1];
      return stepsToProcess.some((parentStep) => lastFrame.stepId === parentStep.stepId);
    });

    // If there are children, recurse into them
    // Pass only descendants (steps that have any of stepsToProcess in their scopeStack)
    if (children.length > 0) {
      const descendants = stepExecutions.filter((step) =>
        step.scopeStack.some((frame) =>
          stepsToProcess.some((parentStep) => frame.stepId === parentStep.stepId)
        )
      );
      return this.getWorkflowOutputRecursive(descendants, scopeDepth + 1, minDepth);
    }

    // Else, return the output(s)
    // At scopeDepth > minDepth, always return as array to aggregate sibling iterations
    // At scopeDepth = minDepth with a single step, return the output directly
    if (scopeDepth === minDepth && stepsToProcess.length === 1) {
      return stepsToProcess[0].output ?? null;
    }

    const outputs = stepsToProcess
      .map((step) => step.output)
      .filter((output): output is JsonValue => output !== undefined);

    return outputs.length > 0 ? outputs : null;
  }
}
