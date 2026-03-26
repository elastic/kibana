/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { EsWorkflowExecution, EsWorkflowStepExecution, StackFrame } from '@kbn/workflows';
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

  public get workflowExecution() {
    return this.workflowExecutionState.getWorkflowExecution();
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

  public getCurrentStepState(): Record<string, unknown> | undefined {
    return this.workflowExecutionState.getStepExecution(this.stepExecutionId)?.state;
  }

  public setCurrentStepState(state: Record<string, unknown> | undefined): void {
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
      startedAt: this.stepExecution?.startedAt ?? stepStartedAt.toISOString(),
    } as Partial<EsWorkflowStepExecution>;

    this.workflowExecutionState.upsertStep(stepExecution);
    this.logStepStart(stepId, this.stepExecutionId);
  }

  public setInput(input: Record<string, unknown>): void {
    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      input: input as JsonValue,
    });
  }

  public finishStep(stepOutput?: unknown): void {
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
      stepId: this.node.stepId,
      stepType: this.node.stepType,
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
   * Attempts to enter a wait state for the step execution.
   * If the step is already in a wait state, it clears the state and returns false (exit wait).
   *
   * "Already waiting" is detected by two complementary signals:
   * - `state.resumeAt` is present: used by timer-based waits (e.g. `wait` step) where a resume
   *   date is written on entry and cleared on exit.
   * - `stepExecution.status === waitingStatus`: used by indefinite waits (e.g. `waitForInput`)
   *   where no `resumeAt` is written but the status alone marks the wait.
   *
   * @param resumeDate - When provided, stored as `resumeAt` so the scheduler can wake the step
   *   at that time. Omit for indefinite waits triggered externally (e.g. resume API).
   * @param waitingStatus - Status to set while waiting. Defaults to `ExecutionStatus.WAITING`.
   * @returns `true` if the step has entered a wait state, `false` if it has exited one.
   */
  public tryEnterWaitUntil(
    resumeDate?: Date,
    waitingStatus: ExecutionStatus = ExecutionStatus.WAITING
  ): boolean {
    // For timer-based waits, resumeAt is the sole sentinel (written on entry, cleared on exit).
    // For indefinite waits (no resumeDate), status is the sentinel since no resumeAt is written.
    const alreadyWaiting =
      resumeDate != null
        ? this.stepExecution?.state?.resumeAt != null
        : this.stepExecution?.status === waitingStatus;

    if (alreadyWaiting) {
      const newState = { ...(this.stepExecution?.state || {}) };
      delete newState.resumeAt;
      this.workflowExecutionState.upsertStep({
        id: this.stepExecutionId,
        state: Object.keys(newState).length ? newState : undefined,
      });
      return false;
    }

    this.workflowExecutionState.upsertStep({
      id: this.stepExecutionId,
      stepId: this.node.stepId,
      stepType: this.node.stepType,
      scopeStack: this.workflowExecution.scopeStack,
      topologicalIndex: this.topologicalOrder.indexOf(this.node.id),
      startedAt: this.stepExecution?.startedAt || new Date().toISOString(),
      status: waitingStatus,
      state: this.buildWaitState(resumeDate),
    });
    return true;
  }

  /**
   * Builds the step state for entering a wait. When a resumeDate is provided (timer-based),
   * adds resumeAt to existing state. When omitted (indefinite), explicitly strips any residual
   * resumeAt so a prior timer sentinel cannot leak into an indefinite wait record.
   */
  private buildWaitState(resumeDate: Date | undefined): Record<string, unknown> | undefined {
    const existing = this.stepExecution?.state ?? {};
    if (resumeDate) {
      return { ...existing, resumeAt: resumeDate.toISOString() };
    }
    const { resumeAt: _stripped, ...rest } = existing;
    return Object.keys(rest).length ? rest : undefined;
  }

  /** Modifies workflow-level execution state. Use sparingly — prefer step output for step-scoped data. */
  public updateWorkflowExecution(update: Partial<EsWorkflowExecution>): void {
    this.workflowExecutionState.updateWorkflowExecution(update);
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

    const tags = ['workflow', 'step', 'fail'];
    if (executionError.type === 'StepSizeLimitExceeded') {
      tags.push('response-size-exceeded');
    }

    this.stepLogger?.logError(message, executionError, {
      workflow: { step_id: this.node.stepId, step_execution_id: this.stepExecutionId },
      event: { action: 'step-fail', category: ['workflow', 'step'] },
      tags,
      labels: {
        step_type: stepType,
        connector_type: stepType,
        step_name: stepName,
        step_id: this.node.stepId,
      },
    });
  }
}
