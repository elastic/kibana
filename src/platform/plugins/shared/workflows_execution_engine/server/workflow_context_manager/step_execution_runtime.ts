/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution, StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { WorkflowContextManager } from './workflow_context_manager';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { RunStepResult } from '../step/node_implementation';
import { parseDuration } from '../utils';

import type { IWorkflowEventLogger } from '../workflow_event_logger';

interface StepExecutionRuntimeInit {
  contextManager: WorkflowContextManager;
  workflowExecutionState: WorkflowExecutionState;
  workflowExecutionGraph: WorkflowGraph;
  stepLogger: IWorkflowEventLogger;
  stepExecutionId: string;
  node: GraphNodeUnion;
  stackFrames: StackFrame[];
}

/**
 * Manages the runtime execution state of a workflow, including step execution, results, and transitions.
 *
 * The `StepExecutionRuntime` class is responsible for orchestrating the execution of workflow steps,
 * tracking their statuses, results, and runtime states, and updating the overall workflow execution status.
 * It maintains the topological order of steps, supports step navigation, and interacts with repositories to persist
 * execution data.
 *
 * Key responsibilities:
 * - Tracks execution status, results, and runtime state for each workflow step.
 * - Navigates between steps according to topological order, skipping steps as needed.
 * - Initiates and finalizes step and workflow executions, updating persistent storage.
 * - Handles workflow completion and error propagation.
 * - Creates APM traces compatible with APM TraceWaterfall embeddable
 *
 * @remarks
 * This class assumes that workflow steps are represented as nodes in a directed acyclic graph (DAG),
 * and uses topological sorting to determine execution order.
 */
export class StepExecutionRuntime {
  private workflowExecutionState: WorkflowExecutionState;
  private workflowGraph: WorkflowGraph;
  private stackFrames: StackFrame[];

  public contextManager: WorkflowContextManager;
  public readonly stepExecutionId: string;
  public readonly stepLogger: IWorkflowEventLogger;
  public readonly node: GraphNodeUnion;
  public readonly abortController = new AbortController();

  public get scopeStack(): WorkflowScopeStack {
    return WorkflowScopeStack.fromStackFrames(this.stackFrames);
  }

  public get stepExecution(): EsWorkflowStepExecution | undefined {
    return this.workflowExecutionState.getStepExecution(this.stepExecutionId);
  }

  private get topologicalOrder(): string[] {
    return this.workflowGraph.topologicalOrder;
  }

  constructor(stepExecutionRuntimeInit: StepExecutionRuntimeInit) {
    this.workflowGraph = stepExecutionRuntimeInit.workflowExecutionGraph;
    this.contextManager = stepExecutionRuntimeInit.contextManager;

    // Use workflow execution ID as traceId for APM compatibility
    this.stepLogger = stepExecutionRuntimeInit.stepLogger;
    this.workflowExecutionState = stepExecutionRuntimeInit.workflowExecutionState;
    this.node = stepExecutionRuntimeInit.node;
    this.stepExecutionId = stepExecutionRuntimeInit.stepExecutionId;
    this.stackFrames = stepExecutionRuntimeInit.stackFrames;
  }

  private get workflowExecution() {
    return this.workflowExecutionState.getWorkflowExecution();
  }

  public stepExecutionExists(): boolean {
    return !!this.workflowExecutionState.getStepExecution(this.stepExecutionId);
  }

  public getCurrentStepResult(): RunStepResult | undefined {
    const stepExecution = this.workflowExecutionState.getStepExecution(this.stepExecutionId);

    if (!stepExecution) {
      return undefined;
    }
    return {
      input: stepExecution.input || {},
      output: stepExecution.output || {},
      error: stepExecution.error ? new ExecutionError(stepExecution.error) : undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getCurrentStepState(): Record<string, any> | undefined {
    return this.workflowExecutionState.getStepExecution(this.stepExecutionId)?.state;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setCurrentStepState(state: Record<string, any> | undefined): void {
    const stepId = this.node.stepId;
    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      stepId,
      state,
    });
  }

  public startStep(): void {
    const stepId = this.node.stepId;
    const stepStartedAt = new Date();

    const stepExecution = {
      id: this.stepExecutionId,
      stepId: this.node.stepId,
      stepType: this.node.stepType,
      scopeStack: this.workflowExecution.scopeStack,
      topologicalIndex: this.topologicalOrder.indexOf(this.node.id),
      status: ExecutionStatus.RUNNING,
      startedAt: stepStartedAt.toISOString(),
    } as Partial<EsWorkflowStepExecution>;

    this.workflowExecutionState.upsertStep(stepExecution);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.logStepStart(stepId, stepExecution.id!);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setInput(input: Record<string, any>): void {
    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      input,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public finishStep(stepOutput?: Record<string, any>): void {
    const startedStepExecution = this.workflowExecutionState.getStepExecution(this.stepExecutionId);
    const stepExecutionUpdate = {
      id: this.stepExecutionId,
      status: ExecutionStatus.COMPLETED,
      finishedAt: new Date().toISOString(),
      output: stepOutput,
    } as Partial<EsWorkflowStepExecution>;

    if (startedStepExecution?.startedAt) {
      stepExecutionUpdate.executionTimeMs =
        new Date(stepExecutionUpdate.finishedAt as string).getTime() -
        new Date(startedStepExecution.startedAt).getTime();
    }

    this.workflowExecutionState.upsertStep(stepExecutionUpdate);
    this.logStepComplete(stepExecutionUpdate);
  }

  public failStep(error: Error): void {
    // if there is a last step execution, fail it
    // if not, create a new step execution with fail
    const executionError = ExecutionError.fromError(error);
    const serializedError = executionError.toSerializableObject();
    const startedStepExecution = this.workflowExecutionState.getStepExecution(this.stepExecutionId);
    const stepExecutionUpdate = {
      id: this.stepExecutionId,
      status: ExecutionStatus.FAILED,
      scopeStack: this.stackFrames,
      finishedAt: new Date().toISOString(),
      output: null,
      error: serializedError,
    } as Partial<EsWorkflowStepExecution>;

    if (startedStepExecution && startedStepExecution.startedAt) {
      stepExecutionUpdate.executionTimeMs =
        new Date(stepExecutionUpdate.finishedAt as string).getTime() -
        new Date(startedStepExecution.startedAt).getTime();
    }
    this.workflowExecutionState.updateWorkflowExecution({
      error: serializedError,
    });
    this.workflowExecutionState.upsertStep(stepExecutionUpdate);
    this.logStepFail(executionError);
  }

  public async flushEventLogs(): Promise<void> {
    await this.stepLogger?.flushEvents();
  }

  /**
   * Attempts to enter a wait state for the step execution based on a relative delay duration.
   * If the step is already in a wait state, it exits the wait state instead.
   *
   * @param delay - The delay duration as a string (e.g., "5s", "1m", "2h").
   * @returns A boolean indicating whether the step has entered a wait state (true) or exited it (false).
   */
  public tryEnterDelay(delay: string): boolean {
    return this.tryEnterWaitUntil(new Date(new Date().getTime() + parseDuration(delay)));
  }

  /**
   * Attempts to enter a wait state for the step execution until a specific absolute date/time.
   * If the step is already in a wait state, it exits the wait state instead.
   *
   * When entering a wait state, the step execution is marked with `ExecutionStatus.WAITING` and
   * the `resumeAt` timestamp is stored in the step's state. The workflow can then resume execution
   * at or after the specified time.
   *
   * @param resumeDate - The absolute date/time when execution should resume (Date object).
   * @returns A boolean indicating whether the step has entered a wait state (true) or exited it (false).
   */
  public tryEnterWaitUntil(resumeDate: Date): boolean {
    const resumeAt = this.stepExecution?.state?.resumeAt;

    if (resumeAt) {
      // already in wait state
      const newState = { ...(this.stepExecution?.state || {}) };
      delete newState.resumeAt;
      this.workflowExecutionState.upsertStep({
        id: this.stepExecutionId,
        state: Object.keys(newState).length ? newState : undefined,
      });
      return false; // was already waiting, now exiting wait state
    }

    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      stepId: this.node.stepId,
      stepType: this.node.stepType,
      scopeStack: this.workflowExecution.scopeStack,
      topologicalIndex: this.topologicalOrder.indexOf(this.node.id),
      startedAt: this.stepExecution?.startedAt || new Date().toISOString(),
      status: ExecutionStatus.WAITING,
      state: {
        ...(this.stepExecution?.state || {}),
        resumeAt: resumeDate.toISOString(),
      },
    });
    return true; // successfully entered wait state
  }

  private logStepStart(stepId: string, stepExecutionId: string): void {
    this.stepLogger?.logInfo(`Step '${stepId}' started`, {
      workflow: { step_id: stepId, step_execution_id: stepExecutionId },
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
      labels: {
        step_type: this.node.stepType,
        connector_type: this.node.stepType,
        step_name: this.node.stepId,
        step_id: stepId,
      },
    });
  }

  private logStepComplete(step: Partial<EsWorkflowStepExecution>): void {
    const isSuccess = step?.status === ExecutionStatus.COMPLETED;
    const stepId = this.node.stepId;
    this.stepLogger?.logInfo(`Step '${stepId}' ${isSuccess ? 'completed' : 'failed'}`, {
      workflow: { step_id: stepId, step_execution_id: step.id },
      event: {
        action: 'step-complete',
        category: ['workflow', 'step'],
        outcome: isSuccess ? 'success' : 'failure',
      },
      tags: ['workflow', 'step', 'complete'],
      labels: {
        step_type: this.node.stepType,
        connector_type: this.node.stepType,
        step_name: this.node.stepId,
        step_id: this.node.stepId,
        execution_time_ms: step.executionTimeMs,
      },
      ...(step.error && {
        error: step.error,
      }),
    });
  }

  private logStepFail(executionError: ExecutionError): void {
    const stepName = this.node.stepId;
    const stepType = this.node.stepType || 'unknown';

    const message = `Step '${stepName}' failed: ${executionError.message}`;

    this.stepLogger?.logError(message, executionError, {
      workflow: { step_id: this.node.stepId, step_execution_id: this.stepExecutionId },
      event: { action: 'step-fail', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'fail'],
      labels: {
        step_type: stepType,
        connector_type: stepType,
        step_name: stepName,
        step_id: this.node.stepId,
      },
    });
  }
}
