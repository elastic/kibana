/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { EnterParallelNode, ExitParallelNode } from '@kbn/workflows/graph';
import type { ParallelBranchCoordinator } from './parallel_branch_coordinator';
import { TERMINAL_BRANCH_STATUSES } from './parallel_branch_coordinator';
import type {
  ParallelBranchResult,
  ParallelBranchState,
  ParallelNamedBranchResult,
  ParallelStepOutput,
  ParallelStepState,
} from './types';
import { readChildExecutionOutcome } from '../../lib/read_child_execution_outcome';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { CancellableNode, NodeImplementation } from '../node_implementation';

/** Child execution statuses that mean the branch is parked rather than working. */
const WAITING_EXECUTION_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.WAITING,
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.WAITING_FOR_CHILD,
]);

export interface ExitParallelNodeImplInit {
  node: ExitParallelNode;
  /** Configuration (mode, concurrency, branch names) lives on the enter node. */
  enterNode: EnterParallelNode;
  workflowRuntime: WorkflowExecutionRuntimeManager;
  stepExecutionRuntime: StepExecutionRuntime;
  workflowLogger: IWorkflowEventLogger;
  stepExecutionRepository: StepExecutionRepository;
  coordinator: ParallelBranchCoordinator;
}

/**
 * Join half of the parallel step.
 *
 * The enter node fans out and jumps straight here, so this node — not the enter
 * node — is where the parallel step waits. It runs once per wake-up: each branch
 * child execution resumes its parent when it reaches a terminal status, and the
 * parent's cursor is parked on this node, so this `run()` is what observes the
 * branches settling.
 *
 * It resolves to the same step execution as the enter node (an exit node pops
 * its own scope before its stack is built), so it reads the `ParallelStepState`
 * the enter node wrote and finishes the step the enter node started.
 */
export class ExitParallelNodeImpl implements NodeImplementation, CancellableNode {
  constructor(private init: ExitParallelNodeImplInit) {}

  public async run(): Promise<void> {
    const { workflowRuntime, stepExecutionRuntime, coordinator } = this.init;
    const state = stepExecutionRuntime.getCurrentStepState() as ParallelStepState | undefined;

    if (!state) {
      // The enter node did not run (a cursor placed directly on the exit node).
      // There is nothing to join; fall through as a plain marker.
      workflowRuntime.navigateToNextNode();
      return;
    }

    const executions = await coordinator.readBranchExecutions(state);
    this.settleBranches(state, executions);

    if (this.hasFailure(state) && coordinator.mode === 'fail-fast') {
      // Branches already in flight are allowed to drain; only branches that
      // never started are cut, and only once nothing is left running, so the
      // step terminates deterministically instead of waiting forever.
      if (!state.branches.some((branch) => branch.status === 'running')) {
        this.markNonTerminalBranches(state, 'skipped');
      }
    } else {
      await coordinator.launchEligibleBranches(state);
    }

    stepExecutionRuntime.setCurrentStepState(state);

    if (state.branches.some((branch) => !TERMINAL_BRANCH_STATUSES.has(branch.status))) {
      this.park();
      return;
    }

    await this.finish(state, executions);
  }

  /**
   * Tears down branches when the step is aborted from the outside — the parallel
   * step's overall `timeout` is enforced by a surrounding timeout zone, and
   * cancelling the workflow aborts the node it is parked on, which is this one.
   *
   * Without this, branch children would keep running (and keep resuming a parent
   * that is no longer listening) after the step they belong to has failed.
   */
  public async onCancel(): Promise<void> {
    const { stepExecutionRuntime, coordinator } = this.init;
    const state = stepExecutionRuntime.getCurrentStepState() as ParallelStepState | undefined;
    if (!state) {
      return;
    }

    await coordinator.cancelRunningBranches(state);
    this.markNonTerminalBranches(state, 'timed_out');
    stepExecutionRuntime.setCurrentStepState(state);
  }

  /** Applies what each launched branch's child execution says to the branch state. */
  private settleBranches(
    state: ParallelStepState,
    executions: Map<string, EsWorkflowExecution>
  ): void {
    const live = state.branches.filter(
      (branch) => branch.executionId !== undefined && !TERMINAL_BRANCH_STATUSES.has(branch.status)
    );

    for (const branch of live) {
      this.settleBranch(branch, executions);
    }
  }

  private settleBranch(
    branch: ParallelBranchState,
    executions: Map<string, EsWorkflowExecution>
  ): void {
    const execution = branch.executionId ? executions.get(branch.executionId) : undefined;
    if (!execution) {
      // The child was launched but its document is not readable yet. Leave the
      // branch running; the next wake-up re-reads it.
      return;
    }

    branch.waiting = WAITING_EXECUTION_STATUSES.has(execution.status);

    if (!isTerminalStatus(execution.status)) {
      return;
    }

    branch.status = execution.status === ExecutionStatus.COMPLETED ? 'completed' : 'failed';
    branch.timedOut = execution.status === ExecutionStatus.TIMED_OUT;
    branch.finishedAt = Date.now();
    branch.waiting = false;
    this.recordBranchWrapperStep(branch, execution);
  }

  private markNonTerminalBranches(
    state: ParallelStepState,
    status: ParallelBranchState['status']
  ): void {
    const live = state.branches.filter((branch) => !TERMINAL_BRANCH_STATUSES.has(branch.status));

    for (const branch of live) {
      branch.status = status;
      branch.timedOut = status === 'timed_out';
      branch.finishedAt = Date.now();
      branch.waiting = false;
    }
  }

  private hasFailure(state: ParallelStepState): boolean {
    return state.branches.some(
      (branch) => branch.status === 'failed' || branch.status === 'timed_out'
    );
  }

  /**
   * Mirrors a settled branch onto its wrapper step execution in the parent, so
   * the execution view shows the branch as terminal at the point the child's own
   * steps are nested under.
   */
  private recordBranchWrapperStep(
    branch: ParallelBranchState,
    execution: EsWorkflowExecution
  ): void {
    if (branch.executionId === undefined) {
      return;
    }

    this.init.workflowRuntime.upsertStepExecution({
      id: branch.executionId,
      status: execution.status,
      finishedAt: new Date().toISOString(),
      ...(branch.startedAt !== undefined && branch.finishedAt !== undefined
        ? { executionTimeMs: branch.finishedAt - branch.startedAt }
        : {}),
      ...(execution.error ? { error: execution.error } : {}),
    });
  }

  /**
   * Re-enters the wait the parent sits in between branch wake-ups.
   *
   * Detection is owned here rather than delegated to `tryEnterWaitUntil`'s
   * toggle: N branches resume the parent N times, so this node re-parks
   * repeatedly and the toggle would read the second visit as "exit the wait".
   */
  private park(): void {
    const { stepExecutionRuntime } = this.init;
    if (stepExecutionRuntime.stepExecution?.status === ExecutionStatus.WAITING_FOR_CHILD) {
      return;
    }
    stepExecutionRuntime.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_CHILD);
  }

  /** Builds the aggregate output and closes the parallel step. */
  private async finish(
    state: ParallelStepState,
    executions: Map<string, EsWorkflowExecution>
  ): Promise<void> {
    const { workflowRuntime, stepExecutionRuntime, coordinator } = this.init;

    const results: ParallelBranchResult[] = [];
    for (const branch of state.branches) {
      results.push(await this.buildBranchResult(branch, executions));
    }

    const succeeded = results.filter((result) => result.status === 'completed').length;
    // Timed-out branches count as failures for the aggregate status.
    const failed = results.filter(
      (result) => result.status === 'failed' || result.status === 'timed_out'
    ).length;

    const output: ParallelStepOutput = {
      results,
      total: results.length,
      succeeded,
      failed,
      status: failed > 0 ? 'failed' : 'completed',
    };

    const namedBranches = this.buildNamedBranchProjection(results);
    if (namedBranches !== undefined) {
      output.branches = namedBranches;
    }

    // Failure disposition follows the `mode`, mirroring Promise.all vs
    // Promise.allSettled:
    //   - `fail-fast` (default): any failed/timed-out branch fails the STEP, so
    //     the failure propagates and the workflow stops (unless handled) instead
    //     of silently succeeding. The aggregate is still persisted as the failed
    //     step's output, so `steps.<p>.output.results` remains readable.
    //   - `settled`: every branch ran to a terminal state on purpose; the step
    //     COMPLETES and the author inspects `output.results` / `.failed` /
    //     `.status` downstream. (The aggregate `status` is still `failed` when any
    //     branch failed — that is a report of the branches, not the step.)
    if (coordinator.mode === 'fail-fast' && failed > 0) {
      stepExecutionRuntime.failStep(this.buildAggregateFailureError(output), output);
    } else {
      stepExecutionRuntime.finishStep(output);
    }

    workflowRuntime.navigateToNextNode();
  }

  private async buildBranchResult(
    branch: ParallelBranchState,
    executions: Map<string, EsWorkflowExecution>
  ): Promise<ParallelBranchResult> {
    // `key` is the item snapshotted at fan-out, so correlation is stable
    // regardless of whether `foreach` would re-resolve identically.
    const correlation = {
      index: branch.index,
      ...(branch.key !== undefined && { key: branch.key }),
    };
    const timing = {
      ...(branch.startedAt !== undefined && { startedAt: branch.startedAt }),
      ...(branch.finishedAt !== undefined && { finishedAt: branch.finishedAt }),
      ...(branch.startedAt !== undefined &&
        branch.finishedAt !== undefined && {
          durationMs: branch.finishedAt - branch.startedAt,
        }),
    };

    if (branch.status === 'skipped') {
      return { ...correlation, ...timing, status: 'skipped' };
    }

    if (branch.status === 'timed_out') {
      return {
        ...correlation,
        ...timing,
        status: 'timed_out',
        error: {
          type: 'TimeoutError',
          message: `Parallel branch ${branch.index} was terminated by a timeout.`,
        },
      };
    }

    const execution = branch.executionId ? executions.get(branch.executionId) : undefined;

    if (!execution) {
      return {
        ...correlation,
        ...timing,
        status: 'failed',
        error: {
          type: 'Error',
          message: `Parallel branch ${branch.index} execution could not be read.`,
        },
      };
    }

    const outcome = await readChildExecutionOutcome({
      execution,
      stepExecutionRepository: this.init.stepExecutionRepository,
      logger: this.init.workflowLogger,
    });

    return outcome.status === 'completed'
      ? { ...correlation, ...timing, status: 'completed', output: outcome.output }
      : {
          ...correlation,
          ...timing,
          status: 'failed',
          error: { type: outcome.error.type, message: outcome.error.message },
        };
  }

  /**
   * Builds the error recorded on the parallel step when it fails under
   * `fail-fast`. Prefers the first failed branch's own error message (with its
   * index/key for correlation) so the surfaced reason is actionable, falling back
   * to a count summary when no branch error was captured.
   */
  private buildAggregateFailureError(output: ParallelStepOutput): Error {
    const firstFailure = output.results.find(
      (result) => result.status === 'failed' || result.status === 'timed_out'
    );
    const branchLabel =
      firstFailure?.key !== undefined && typeof firstFailure.key === 'string'
        ? `"${firstFailure.key}"`
        : `${firstFailure?.index ?? '?'}`;
    const branchError =
      firstFailure?.error &&
      typeof firstFailure.error === 'object' &&
      firstFailure.error !== null &&
      'message' in firstFailure.error
        ? String((firstFailure.error as { message?: unknown }).message ?? '')
        : undefined;
    const reason = branchError ? `: ${branchError}` : '.';
    return new Error(
      `Parallel step "${this.init.enterNode.stepId}" failed (fail-fast): ${output.failed} of ${output.total} ` +
        `branch(es) failed; first failure in branch ${branchLabel}${reason}`
    );
  }

  /**
   * Builds the static-mode `branches` projection: results keyed by branch name.
   * Returns `undefined` in dynamic `foreach` mode (no static branch definitions),
   * so the aggregate omits the field entirely there.
   */
  private buildNamedBranchProjection(
    results: ParallelBranchResult[]
  ): Record<string, ParallelNamedBranchResult> | undefined {
    const staticBranches = this.init.enterNode.branches;
    if (staticBranches === undefined) {
      return undefined;
    }

    const projection: Record<string, ParallelNamedBranchResult> = {};
    for (const result of results) {
      const name = staticBranches[result.index]?.name;
      if (name !== undefined) {
        projection[name] = {
          status: result.status,
          ...(result.output !== undefined && { output: result.output }),
          ...(result.error !== undefined && { error: result.error }),
        };
      }
    }
    return projection;
  }
}
