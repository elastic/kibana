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
import type { ScopeData } from './scope_data';
import type { IWorkflowContextManager } from './workflow_context_manager';
import type { IWorkflowEventLogger } from './workflow_event_logger';

/**
 * Minimal scope-stack surface needed by flow-control nodes that walk the
 * ancestor scope chain (timeout nodes, workflow.output).
 *
 * The concrete plugin implementation is `WorkflowScopeStack`; nodes in
 * `@kbn/workflows-execution-engine-core` only ever see this interface.
 */
export interface IScopeStack {
  isEmpty(): boolean;
  getCurrentScope(): ScopeData;
  /** Returns a new scope-stack with the top frame removed. */
  exitScope(): IScopeStack;
  readonly stackFrames: StackFrame[];
}

/**
 * Per-step runtime collaborator used by flow-control nodes.
 *
 * Concrete plugin implementations also manage APM spans, log emission
 * shapes, and the workflow-execution-state plumbing. Nodes that move into
 * `@kbn/workflows-execution-engine-core` only ever see this surface.
 */
export interface IStepExecutionRuntime {
  /** Read access to the workflow-level context manager. */
  readonly contextManager: IWorkflowContextManager;

  /** Logger scoped to this step execution. */
  readonly stepLogger: IWorkflowEventLogger;

  /** Current `EsWorkflowStepExecution` record, or `undefined` if the step has not started. */
  readonly stepExecution: EsWorkflowStepExecution | undefined;

  /** Returns the per-step custom state object, written via `setCurrentStepState`. */
  getCurrentStepState(): Record<string, unknown> | undefined;

  /** Replaces (or clears, when `undefined`) the per-step custom state. */
  setCurrentStepState(state: Record<string, unknown> | undefined): void;

  /** Records the resolved input that this step is about to execute on. */
  setInput(input: Record<string, unknown>): void;

  /** Marks the step as `RUNNING` and emits a `step-start` log event. */
  startStep(): void;

  /** Marks the step as `COMPLETED` and emits a `step-complete` log event. */
  finishStep(stepOutput?: unknown): void;

  /** Marks the step as `FAILED` with the given error. */
  failStep(error: Error): void;

  /** Flushes any pending step log events. */
  flushEventLogs(): Promise<void>;

  /**
   * Attempts to enter a relative-delay wait state (e.g. `"5s"`). Returns
   * `true` if the step just entered the wait, `false` if it was already
   * waiting and is now exiting.
   */
  tryEnterDelay(delay: string): boolean;

  /**
   * Attempts to enter a wait state. With `resumeDate` it's a timer-based
   * wait that the scheduler resumes; without, it's an indefinite wait
   * resumed externally (e.g. `waitForInput`).
   *
   * Returns `true` if the step just entered the wait, `false` if it was
   * already waiting and is now exiting.
   */
  tryEnterWaitUntil(resumeDate?: Date, waitingStatus?: ExecutionStatus): boolean;

  /**
   * Returns `true` when a persisted `EsWorkflowStepExecution` record already
   * exists for this runtime (i.e. the step was previously started and its
   * record is loaded). Used by `unwindScopes` to skip finish-calls for steps
   * that were never started.
   */
  stepExecutionExists(): boolean;

  /**
   * Returns the last recorded input/output/error triple for this step, or
   * `undefined` when the step has not run yet. Used by retry nodes to inspect
   * the error from the most recent failed attempt.
   */
  getCurrentStepResult(): { input: unknown; output: unknown; error: unknown } | undefined;

  /**
   * AbortController whose `signal` is passed to abortable operations so they
   * can be interrupted by timeout nodes.
   */
  readonly abortController: { readonly signal: AbortSignal; abort(): void };

  /**
   * Scope stack derived from the current stack frames. Timeout and
   * workflow.output nodes walk this to finish ancestor steps when the
   * workflow terminates early.
   */
  readonly scopeStack: IScopeStack;
}
