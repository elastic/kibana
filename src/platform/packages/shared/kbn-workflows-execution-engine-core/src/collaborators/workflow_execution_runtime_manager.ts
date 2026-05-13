/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import type { IStepExecutionRuntimeFactory } from './step_execution_runtime_factory';
import type { ScopeData } from './scope_data';

/**
 * Workflow-level runtime collaborator used by flow-control nodes.
 *
 * The plugin's concrete implementation also drives APM transactions,
 * persistence, scope stack bookkeeping, etc. The shape exposed here is
 * the subset that flow-control / branching nodes call when they move
 * into `@kbn/workflows-execution-engine-core`.
 *
 * Additional methods (e.g. `unwindScopes`, scope-stack accessors) will be
 * added to this interface as the dependent nodes move in subsequent commits.
 */
export interface IWorkflowExecutionRuntimeManager {
  /** Snapshot of the current `EsWorkflowExecution` record. */
  getWorkflowExecution(): EsWorkflowExecution;

  /** Sets the next node to execute. Throws if `nodeId` is not in the graph. */
  navigateToNode(nodeId: string): void;

  /** Sets the next node to execute to the topological successor of the current node. */
  navigateToNextNode(): void;

  /** Sets the next node to execute to the topological successor of the given node. */
  navigateToAfterNode(nodeId: string): void;

  /** Pushes a new scope frame for the current `enter-*` node. No-op otherwise. */
  enterScope(subScopeId?: string): void;

  /** Replaces the workflow's output map. */
  setWorkflowOutputs(outputs: Record<string, unknown>): void;

  /** Updates the workflow's execution status (e.g. `RUNNING`, `COMPLETED`). */
  setWorkflowStatus(status: ExecutionStatus): void;

  /**
   * Sets the workflow status to `CANCELLED` with the given reason and writes
   * `cancelledAt` / `cancelledBy` fields.
   */
  setWorkflowCancelled(reason: string): void;

  /** Records a workflow-level error (without changing status). Clears with `undefined`. */
  setWorkflowError(error: Error | undefined): void;

  /**
   * Marks the workflow as `TIMED_OUT` with `finishedAt` and `duration` set
   * from the current clock and the workflow's `startedAt`.
   */
  markWorkflowTimeouted(): void;

  /**
   * Unwinds scope frames from the current scope stack, calling `finishStep()`
   * on each scope's runtime as it is popped.
   *
   * @param stepExecutionRuntimeFactory - Factory used to build a runtime for
   *   each scope being exited.
   * @param shouldStop - Optional predicate; unwinding stops at (but does not
   *   include) the first scope for which it returns `true`. When omitted the
   *   entire stack is unwound.
   * @param options.inclusive - When `true`, the scope that matched
   *   `shouldStop` is also unwound.
   */
  unwindScopes(
    stepExecutionRuntimeFactory: IStepExecutionRuntimeFactory,
    shouldStop?: (scope: ScopeData) => boolean,
    options?: { inclusive?: boolean }
  ): void;
}
