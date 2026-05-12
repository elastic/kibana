/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { IWorkflowContextManager } from './workflow_context_manager';
import type { IWorkflowEventLogger } from './workflow_event_logger';

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
}
