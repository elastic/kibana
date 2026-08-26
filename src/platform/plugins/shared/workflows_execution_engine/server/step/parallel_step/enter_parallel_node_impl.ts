/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParallelConcurrencyObject, StackFrame } from '@kbn/workflows';
import {
  DEFAULT_PARALLEL_CONCURRENCY,
  DEFAULT_PARALLEL_MAX_CONCURRENCY,
  DEFAULT_PARALLEL_MAX_FAN_OUT,
  ExecutionStatus,
} from '@kbn/workflows';
import type { EnterParallelNode, WorkflowGraph } from '@kbn/workflows/graph';
import type {
  ParallelBranchResult,
  ParallelBranchState,
  ParallelNamedBranchResult,
  ParallelStepOutput,
  ParallelStepState,
} from './types';
import { isTemplateExpression, parseDuration } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowScopeStack } from '../../workflow_context_manager/workflow_scope_stack';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { CancellableNode, NodeImplementation } from '../node_implementation';
import { isCancellableNode } from '../node_implementation';
import type { NodesFactory } from '../nodes_factory';

// Re-tick the parallel node when branches still have work to do but nothing is
// explicitly waiting on a timer — typically the wave case (a wave of branches
// just finished and the next wave needs launching), or a branch that ended the
// tick non-terminal without writing its own `resumeAt`.
//
// The resume always goes through a durable Task Manager task (the parallel step
// parks with `forceTaskSchedule`), so the floor only needs to be small enough to
// feel prompt between waves while being large enough that a branch which keeps
// reporting RUNNING without a `resumeAt` cannot drive a sub-second reschedule
// loop. A sub-second value here is pointless (it rounds up to the next TM poll)
// and risky (it removes the only backpressure on a no-timer branch), so we floor
// at a small fixed delay rather than 1ms.
const RETICK_FLOOR_MS = 1_000;

// Error recorded on a branch's step execution when the branch is terminated by
// its per-branch (or the overall step) timeout. Shared by every timeout path so
// the per-branch step record carries a consistent reason.
const PARALLEL_BRANCH_TIMEOUT_MESSAGE = 'Parallel branch was terminated by a timeout.';

const TERMINAL_BRANCH_STATUSES = new Set<ParallelBranchState['status']>([
  'completed',
  'failed',
  'skipped',
  'timed_out',
]);

type ParallelMode = 'fail-fast' | 'settled';
const DEFAULT_PARALLEL_MODE: ParallelMode = 'fail-fast';

export class EnterParallelNodeImpl implements NodeImplementation, CancellableNode {
  /**
   * True while a branch's scope is installed on the shared workflow runtime.
   * Used by {@link withBranchScope} to detect re-entrant (overlapping) scope
   * installs, which indicate a branch step read scope after an await.
   */
  private branchScopeActive = false;

  constructor(
    private node: EnterParallelNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory,
    private nodesFactory: NodesFactory,
    private workflowGraph: WorkflowGraph
  ) {}

  public async run(): Promise<void> {
    const state = this.stepExecutionRuntime.getCurrentStepState() as ParallelStepState | undefined;
    if (!state) {
      await this.initParallel();
      return;
    }
    await this.tick(state);
  }

  /**
   * Cancellation cleanup. The parallel step's overall `timeout` is enforced by a
   * surrounding step-level timeout zone (the inner node's own `timeout` is
   * stripped at graph-build time), so when that zone fires it aborts this step
   * from the outside — `tick()` never runs its own overall-timeout sweep. Without
   * cleanup, branches parked in a durable wait/poll would leak their step records
   * in WAITING forever even though the parallel step is failed.
   *
   * Here we transition every still-running branch's step record to TIMED_OUT and
   * invoke each branch node's own `onCancel()` (e.g. `workflow.execute` cancelling
   * its child workflow) so neither the per-branch record nor an external resource
   * leaks. The parallel step record itself is failed by the surrounding error
   * handling (the timeout zone's TimeoutError). Idempotent: branches already
   * terminal are skipped, `timeoutStep` upserts by id, and `onCancel` hooks are
   * required to be idempotent.
   */
  public async onCancel(): Promise<void> {
    const state = this.stepExecutionRuntime.getCurrentStepState() as ParallelStepState | undefined;
    if (!state) {
      return;
    }
    await this.timeOutNonTerminalBranches(state, Date.now());
    this.stepExecutionRuntime.setCurrentStepState(state);
  }

  /** True when this is a static scatter-gather (`branches`) parallel step. */
  private get isStatic(): boolean {
    return Array.isArray(this.node.branches) && this.node.branches.length > 0;
  }

  private async initParallel(): Promise<void> {
    this.stepExecutionRuntime.startStep();

    const branches = this.isStatic ? this.initStaticBranches() : this.initDynamicBranches();
    if (branches === undefined) {
      // Empty dynamic fan-out: already finished with an empty aggregate.
      return;
    }

    const state: ParallelStepState = {
      total: branches.length,
      branches,
      startedAt: Date.now(),
      static: this.isStatic,
    };
    this.stepExecutionRuntime.setCurrentStepState(state);
    this.workflowLogger.logDebug(
      `Parallel step "${this.node.stepId}" fanning out over ${branches.length} branches.`,
      { workflow: { step_id: this.node.stepId } }
    );

    await this.tick(state);
  }

  /**
   * Static scatter-gather: one branch per named branch descriptor on the enter
   * node. The branch `key` is its name, for correlation in the aggregate output.
   */
  private initStaticBranches(): ParallelBranchState[] {
    const branches = this.node.branches ?? [];
    return branches.map((branch, index) => ({
      index,
      key: branch.name,
      status: 'pending',
      started: false,
    }));
  }

  /**
   * Dynamic fan-out: one branch per resolved `foreach` item. Returns `undefined`
   * when the list is empty (the step is finished with an empty aggregate here).
   */
  private initDynamicBranches(): ParallelBranchState[] | undefined {
    const foreachConfig = this.node.configuration.foreach;
    // Persist the expression as input so the context builder can re-evaluate the
    // per-branch item without storing the whole list in state.
    this.stepExecutionRuntime.setInput({
      foreach: Array.isArray(foreachConfig) ? JSON.stringify(foreachConfig) : foreachConfig,
    });

    const items = this.getItems();

    if (items.length > DEFAULT_PARALLEL_MAX_FAN_OUT) {
      throw new Error(
        `Parallel step "${this.node.stepId}" fan-out of ${items.length} exceeds the maximum of ${DEFAULT_PARALLEL_MAX_FAN_OUT}. ` +
          `Reduce the size of the "foreach" list.`
      );
    }

    if (items.length === 0) {
      this.workflowLogger.logDebug(
        `Parallel step "${this.node.stepId}" has no items to fan out over. Skipping execution.`,
        { workflow: { step_id: this.node.stepId } }
      );
      this.finish([]);
      return undefined;
    }

    // Snapshot each item as the branch's `key` at init. `finish` reads this back
    // instead of re-evaluating `foreach`, so the index→item correlation cannot
    // drift if the expression resolves to a different value on a later tick.
    return items.map((item, index) => ({
      index,
      key: item,
      status: 'pending',
      started: false,
    }));
  }

  private async tick(state: ParallelStepState): Promise<void> {
    const now = Date.now();

    // Overall step timeout: once the configured budget is exceeded, no further
    // branches run. In-flight and not-yet-started branches are marked timed out
    // so the step terminates immediately with a clear reason.
    const overallTimeoutMs = this.resolveTimeoutMs(this.node.configuration.timeout);
    if (overallTimeoutMs !== undefined && now - state.startedAt > overallTimeoutMs) {
      await this.timeOutNonTerminalBranches(state, now);
      this.stepExecutionRuntime.setCurrentStepState(state);
      this.workflowLogger.logDebug(
        `Parallel step "${this.node.stepId}" exceeded its overall timeout of ${this.node.configuration.timeout}.`,
        { workflow: { step_id: this.node.stepId } }
      );
      this.finish(state.branches);
      return;
    }

    const { max, countWaiting } = this.resolveConcurrency();

    // A branch occupies a slot while running. When count-waiting is true (the
    // default) a branch parked in a durable wait keeps holding its slot; when
    // false a parked branch frees its slot so a not-yet-started branch can begin.
    // An actively-running branch (not parked in a wait) always counts against
    // `max` regardless of count-waiting — otherwise the cap would never bind.
    const slotsInUse = () =>
      state.branches.filter((b) => {
        if (TERMINAL_BRANCH_STATUSES.has(b.status)) return false;
        if (b.status !== 'running') return false;
        if (countWaiting) return true;
        return !b.waiting;
      }).length;

    // fail-fast (default): once a branch has failed (or timed out), stop
    // scheduling branches that have not started yet, but let in-flight drain.
    const failFast = this.resolveMode() === 'fail-fast';
    const hasFailure = state.branches.some(
      (b) => b.status === 'failed' || b.status === 'timed_out'
    );

    // Collect every branch eligible to advance on this tick, marking them
    // started up-front so the concurrency window accounts for them.
    const branchesToAdvance: ParallelBranchState[] = [];
    for (const branch of state.branches) {
      const isTerminal = TERMINAL_BRANCH_STATUSES.has(branch.status);
      const blockedByConcurrency = !branch.started && slotsInUse() >= max;
      const blockedByFailFast = failFast && hasFailure && !branch.started;
      if (!isTerminal && !blockedByConcurrency && !blockedByFailFast) {
        if (!branch.started) {
          branch.startedAt = now;
        }
        branch.started = true;
        branch.status = 'running';
        branchesToAdvance.push(branch);
      }
    }

    const branchTimeoutMs = this.resolveTimeoutMs(this.node.configuration['branch-timeout']);

    // Advance all eligible branches concurrently so I/O-bound branch bodies
    // (e.g. http calls) overlap within a single tick instead of serializing
    // behind one another. Each branch is bounded by the smaller of its own
    // per-branch deadline and the overall step deadline; exceeding it aborts the
    // in-flight work and marks the branch timed out.
    const overallDeadline =
      overallTimeoutMs !== undefined ? state.startedAt + overallTimeoutMs : undefined;

    // Capture the base scope ONCE, synchronously, before any branch runs. Each
    // branch's stack frames are derived from this stable base so concurrent
    // branches never read a base that a sibling's `withBranchScope` mutation has
    // temporarily changed. This keeps each branch's persisted scope (and thus
    // its unique step-execution id) correct and distinct per fan-out index.
    const baseScope = this.wfExecutionRuntimeManager.getCurrentNodeScope();

    const advanced = await Promise.all(
      branchesToAdvance.map(async (branch) => {
        const branchDeadline =
          branchTimeoutMs !== undefined && branch.startedAt !== undefined
            ? branch.startedAt + branchTimeoutMs
            : undefined;
        const deadline = this.minDefined(overallDeadline, branchDeadline);
        const branchStackFrames = this.buildBranchStackFramesFrom(baseScope, branch.index);
        const result = await this.advanceBranch(
          branch.index,
          branchStackFrames,
          branch.currentNodeId,
          deadline
        );
        return { index: branch.index, result };
      })
    );

    // Apply the recorded statuses synchronously (no await between read and write).
    const advancedByIndex = new Map(advanced.map(({ index, result }) => [index, result]));
    let branchFailedThisTick = false;
    for (const branch of state.branches) {
      const result = advancedByIndex.get(branch.index);
      if (result !== undefined) {
        branch.status = result.status;
        branch.currentNodeId = result.currentNodeId;
        // A branch that comes back `running` parked in a durable wait/poll; mark
        // it so `count-waiting: false` can free its slot for a queued branch.
        branch.waiting = result.status === 'running';
        if (result.status === 'timed_out') {
          branch.timedOut = true;
        }
        if (result.status === 'failed') {
          branchFailedThisTick = true;
        }
        if (TERMINAL_BRANCH_STATUSES.has(result.status) && branch.finishedAt === undefined) {
          branch.finishedAt = Date.now();
        }
      }
    }

    // Contain branch failures. A branch body step that fails calls `failStep`,
    // which sets the *workflow-level* error as a side effect. Left in place, the
    // execution loop's `catchError` would escalate that to a whole-workflow
    // failure the moment this parallel step parks — aborting after the FIRST
    // failed branch and so breaking `settled` (and even fail-fast's drain) and
    // leaving the aggregate output unwritten. The parallel step owns branch
    // failure accounting itself (tracked in `state.branches` and surfaced via
    // the aggregate `results[]` / `failed` / `status`), so we clear the leaked
    // workflow error here. Final disposition is decided in `finish()`.
    if (branchFailedThisTick) {
      this.wfExecutionRuntimeManager.setWorkflowError(undefined);
    }

    // Catch poll/yield branches that exceeded their per-branch budget while
    // parked across ticks (their body never blocks, so the in-tick deadline race
    // does not apply to them).
    if (branchTimeoutMs !== undefined) {
      const checkNow = Date.now();
      const timedOutBranches: ParallelBranchState[] = [];
      for (const branch of state.branches) {
        const stillRunning = branch.status === 'running';
        const exceeded =
          branch.startedAt !== undefined && checkNow - branch.startedAt > branchTimeoutMs;
        if (stillRunning && exceeded) {
          branch.status = 'timed_out';
          branch.timedOut = true;
          branch.finishedAt = checkNow;
          timedOutBranches.push(branch);
        }
      }
      // The branches parked in a durable wait/poll and never reached a terminal
      // status; mark each one's current step execution TIMED_OUT (and cancel its
      // node) so the per-branch step record does not leak in WAITING/RUNNING.
      await Promise.all(timedOutBranches.map((branch) => this.markBranchNodeTimedOut(branch)));
    }

    // In fail-fast mode, once a failure exists and all in-flight branches have
    // drained, any branch that never started is marked skipped so the step can
    // terminate deterministically instead of waiting forever.
    if (failFast && state.branches.some((b) => b.status === 'failed' || b.status === 'timed_out')) {
      const inFlight = state.branches.some(
        (b) => b.started && !TERMINAL_BRANCH_STATUSES.has(b.status)
      );
      if (!inFlight) {
        for (const branch of state.branches) {
          if (!branch.started && !TERMINAL_BRANCH_STATUSES.has(branch.status)) {
            branch.status = 'skipped';
            branch.finishedAt = now;
          }
        }
      }
    }

    this.stepExecutionRuntime.setCurrentStepState(state);

    const allTerminal = state.branches.every((b) => TERMINAL_BRANCH_STATUSES.has(b.status));
    if (allTerminal) {
      this.finish(state.branches);
      return;
    }

    // Some branch is still in flight (running its single step, possibly parked
    // in a durable wait), or not-yet-started branches remain outside the current
    // concurrency window. Re-enter a wait and let the resume task tick us again.
    //
    // Branch body steps run on the SHARED workflow runtime and advance its
    // cursor (`nextNodeId`) as they complete, so after ticking branches the
    // cursor points at a branch-body node. Reclaim it for the parallel enter
    // node before parking, otherwise the resume would re-enter a leaked
    // branch-body node instead of re-ticking the parallel — leaving the
    // remaining branches unrun and the step silently "completing" early.
    this.wfExecutionRuntimeManager.navigateToNode(this.node.id);
    const resumeAt = this.computeResumeAt(state);
    this.stepExecutionRuntime.enterWaitUntil(resumeAt, undefined, true);
  }

  /**
   * Advances a branch through its body subgraph for one tick. Starting from the
   * branch's cursor (or the body start node on first run), it runs nodes and
   * follows linear successors until the branch:
   * - reaches the parallel exit node => the branch is `completed`, or
   * - hits a node that fails => the branch is `failed`, or
   * - parks in a durable wait (poll/wait step) => stays `running`, cursor kept
   *   on that node so the next tick re-runs it.
   *
   * v1 supports a straight-line branch body (atomic/wait steps). Nested
   * flow-control inside a branch (if/switch/foreach/while) is not yet supported
   * and is rejected at graph-build time.
   */
  private async advanceBranch(
    index: number,
    branchStackFrames: StackFrame[],
    cursor: string | undefined,
    deadline: number | undefined
  ): Promise<{ status: ParallelBranchState['status']; currentNodeId: string | undefined }> {
    let currentNodeId = cursor ?? this.getBranchStartNodeId(index);

    // Run nodes in this branch until it waits, fails, times out, or reaches the
    // exit. A single tick may complete several run-to-completion steps in a row.
    // The visited set bounds the walk defensively against an unexpected cycle.
    const visited = new Set<string>();
    while (!visited.has(currentNodeId)) {
      visited.add(currentNodeId);

      // If the deadline has already passed before starting the next node, stop.
      // This happens when the branch parked in a durable wait/poll on a prior
      // tick and its `branch-timeout` elapsed before it was re-ticked. The parked
      // step execution is still WAITING here, so transition it to TIMED_OUT —
      // otherwise the per-branch record leaks in WAITING after the step finishes
      // (the `runBranchNode` deadline path below marks its own record, but this
      // early return never enters `runBranchNode`).
      if (deadline !== undefined && Date.now() >= deadline) {
        await this.markBranchNodeTimedOutAt(index, branchStackFrames, currentNodeId);
        return { status: 'timed_out', currentNodeId };
      }

      const runStatus = await this.runBranchNode(branchStackFrames, currentNodeId, deadline);

      if (runStatus === 'timed_out') {
        return { status: 'timed_out', currentNodeId };
      }
      if (runStatus === 'failed') {
        return { status: 'failed', currentNodeId };
      }
      if (runStatus === 'waiting') {
        // Durable wait: keep the cursor on this node and re-tick later. Allow
        // the same node to run again on the next tick by not treating it as
        // visited across ticks (the set is per-tick).
        return { status: 'running', currentNodeId };
      }

      // Completed: move to the next node in the body. Reaching the parallel
      // exit node (the body's only outgoing edge) means the branch is done.
      const nextNodeId = this.getBranchSuccessor(currentNodeId);
      if (nextNodeId === undefined || nextNodeId === this.node.exitNodeId) {
        return { status: 'completed', currentNodeId };
      }
      currentNodeId = nextNodeId;
    }

    // Reached only if a cycle is detected; treat as completed to avoid spinning.
    return { status: 'completed', currentNodeId };
  }

  /**
   * The first node of branch `index`'s body. Dynamic mode shares a single body
   * (`branchStartNodeId`); static mode has one start node per named branch.
   */
  private getBranchStartNodeId(index: number): string {
    const branchStartNodeId = this.node.branches
      ? this.node.branches[index]?.startNodeId
      : this.node.branchStartNodeId;
    if (branchStartNodeId === undefined) {
      throw new Error(
        `Parallel step "${this.node.stepId}" could not resolve a start node for branch ${index}.`
      );
    }
    return branchStartNodeId;
  }

  /** Returns the smaller of two optional epoch-ms deadlines. */
  private minDefined(a: number | undefined, b: number | undefined): number | undefined {
    if (a === undefined) return b;
    if (b === undefined) return a;
    return Math.min(a, b);
  }

  /** Resolves the single in-body successor of a branch node, or undefined. */
  private getBranchSuccessor(nodeId: string): string | undefined {
    const successors = this.workflowGraph.getDirectSuccessors(nodeId);
    return successors[0]?.id;
  }

  /**
   * Runs one branch-body node in the branch's own scope, returning a coarse
   * status: `completed`, `failed`, `waiting` (still in flight / parked in a
   * wait), or `timed_out` (the deadline elapsed while the node was running, so
   * its in-flight work was aborted).
   *
   * Each branch runs against its own `StepExecutionRuntime` whose context
   * manager resolves per-branch scope (e.g. {{ foreach.item }}) from its own
   * stack frames — not the shared mutable workflow scope — so sibling branches
   * can run concurrently without clobbering each other's context.
   */
  private async runBranchNode(
    branchStackFrames: StackFrame[],
    nodeId: string,
    deadline: number | undefined
  ): Promise<'completed' | 'failed' | 'waiting' | 'timed_out'> {
    const branchRuntime = this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
      nodeId,
      stackFrames: branchStackFrames,
    });

    const branchImpl = this.nodesFactory.create(branchRuntime);

    const timedOut = await this.runWithDeadline(
      async () => {
        // Pre-warm (rehydrate evicted outputs) — scope-independent, safe to run
        // concurrently with sibling branches.
        await branchRuntime.contextManager.ensureContextReady();
        // Start the node with the branch's scope installed. The step's
        // synchronous template rendering (getInput) reads the scope before the
        // first await, so the scope only needs to be correct for this synchronous
        // prefix; we restore it immediately so concurrent siblings are unaffected.
        // The returned promise's awaited I/O does not read the global scope.
        const runPromise = this.withBranchScope(branchStackFrames, () =>
          Promise.resolve(branchImpl.run())
        );
        await runPromise;
      },
      deadline,
      branchRuntime.abortController
    );

    // Release the read-pins set by ensureContextReady for this branch so its
    // pinned outputs become eviction-eligible again. Runs on every exit path
    // (completed / failed / waiting / timed-out). A still-in-flight 'waiting'
    // branch re-pins on the next tick's ensureContextReady call. Idempotent.
    branchRuntime.contextManager.releaseReadPins();

    if (timedOut) {
      // The deadline aborted the branch's in-flight work mid-run, so the branch
      // node never wrote its own terminal status — its step execution would leak
      // in RUNNING forever. Invoke the node's cancellation cleanup (e.g. a
      // `workflow.execute` cancelling its child workflow so it doesn't keep
      // running orphaned) then mark it TIMED_OUT so the per-branch step record
      // matches the aggregate `results[]`. This does not set the workflow error
      // (the parallel step owns timeout disposition); see `timeoutStep`.
      await this.runBranchOnCancel(branchImpl);
      branchRuntime.timeoutStep(new Error(PARALLEL_BRANCH_TIMEOUT_MESSAGE));
      return 'timed_out';
    }

    const status = branchRuntime.stepExecution?.status;
    if (status === ExecutionStatus.COMPLETED) {
      return 'completed';
    }
    if (status === ExecutionStatus.FAILED) {
      return 'failed';
    }
    // WAITING / RUNNING / undefined: still in flight, retry on next tick.
    return 'waiting';
  }

  /**
   * Runs `fn` and resolves to `true` if the deadline elapsed first (in which
   * case the abort controller is fired so the in-flight work — e.g. an http
   * request wired to the step's signal — is cancelled). Resolves `false` when
   * `fn` settles before the deadline. With no deadline it just awaits `fn`.
   */
  private async runWithDeadline(
    fn: () => Promise<unknown>,
    deadline: number | undefined,
    abortController: AbortController
  ): Promise<boolean> {
    if (deadline === undefined) {
      await fn().catch(() => undefined);
      return false;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      abortController.abort();
      return true;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const timeoutPromise = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        abortController.abort();
        resolve();
      }, remaining);
    });

    try {
      await Promise.race([fn().catch(() => undefined), timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }

    return timedOut;
  }

  /**
   * Installs `branchStackFrames` as the global workflow scope, runs `fn`, then
   * restores the previous scope. `fn` MUST complete all scope-dependent reads
   * synchronously (e.g. template rendering in a step's `getInput()`), because
   * the scope is restored as soon as `fn` returns — before any awaited I/O.
   *
   * The shared workflow scope is a single mutable slot, so two branches must
   * never have their scope installed at the same time. `Promise.all` advances
   * branches concurrently, but each `withBranchScope` window is purely
   * synchronous, so the windows cannot overlap — unless a branch step reads
   * scope *after* an `await` (then a sibling's window may be active). The
   * re-entrancy guard turns that latent corruption into a loud, deterministic
   * failure for the next step author instead of a silently wrong `foreach.item`.
   */
  private withBranchScope<T>(branchStackFrames: StackFrame[], fn: () => T): T {
    if (this.branchScopeActive) {
      throw new Error(
        `Parallel step "${this.node.stepId}": re-entrant branch scope detected. A branch ` +
          `step must read all scope-dependent values (e.g. {{ foreach.item }}) synchronously, ` +
          `before its first await. Reading workflow scope after an await is unsafe under ` +
          `concurrent fan-out and can leak a sibling branch's context.`
      );
    }
    this.branchScopeActive = true;
    const previousScope = this.wfExecutionRuntimeManager.getCurrentNodeScope();
    this.wfExecutionRuntimeManager.setScopeStack(branchStackFrames);
    try {
      return fn();
    } finally {
      this.wfExecutionRuntimeManager.setScopeStack(previousScope);
      this.branchScopeActive = false;
    }
  }

  /**
   * Marks every non-terminal branch TIMED_OUT — both in the persisted parallel
   * state and on each branch's own step-execution record — so no branch leaks in
   * WAITING/RUNNING when the step is torn down by an overall timeout (whether via
   * the in-`tick` overall-timeout sweep or an external cancel/timeout-zone abort).
   */
  private async timeOutNonTerminalBranches(state: ParallelStepState, now: number): Promise<void> {
    const nonTerminal = state.branches.filter(
      (branch) => !TERMINAL_BRANCH_STATUSES.has(branch.status)
    );
    for (const branch of nonTerminal) {
      branch.status = 'timed_out';
      branch.timedOut = true;
      branch.finishedAt = now;
    }
    // Only branches that actually started have a step-execution record to
    // transition (and a node to cancel); not-yet-started (queued) branches have
    // none. Run cleanup concurrently — each branch cancels an independent node.
    await Promise.all(
      nonTerminal
        .filter((branch) => branch.started)
        .map((branch) => this.markBranchNodeTimedOut(branch))
    );
  }

  /**
   * Marks a single branch's current step execution TIMED_OUT. Used for branches
   * that parked in a durable wait/poll across ticks and then blew their
   * `branch-timeout`, so they never returned through `runBranchNode`'s in-tick
   * timeout path. Recreates the branch runtime for its current node and records
   * the timeout without touching the workflow-level error.
   */
  private async markBranchNodeTimedOut(branch: ParallelBranchState): Promise<void> {
    const nodeId = branch.currentNodeId ?? this.getBranchStartNodeId(branch.index);
    await this.markBranchNodeTimedOutAt(
      branch.index,
      this.buildBranchStackFrames(branch.index),
      nodeId
    );
  }

  /**
   * Transitions branch `index`'s current step execution to TIMED_OUT using the
   * exact stack frames the branch ran with, so the upsert targets the same
   * deterministic step-execution id as the parked record (rather than recomputing
   * frames from the current scope, which can drift). Does not touch the
   * workflow-level error; the parallel step owns timeout disposition.
   *
   * Before recording the timeout, fire the branch node's abort signal and invoke
   * its `onCancel()` cleanup hook (if it is a cancellable node). A branch body may
   * hold external resources — most importantly a `workflow.execute` step whose
   * `onCancel()` cancels the child workflow — and marking the step record TIMED_OUT
   * alone would leave that child running orphaned in the background.
   */
  private async markBranchNodeTimedOutAt(
    index: number,
    branchStackFrames: StackFrame[],
    nodeId: string
  ): Promise<void> {
    const branchRuntime = this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
      nodeId,
      stackFrames: branchStackFrames,
    });
    await this.cancelBranchNode(branchRuntime);
    branchRuntime.timeoutStep(new Error(PARALLEL_BRANCH_TIMEOUT_MESSAGE));
  }

  /**
   * Fires the branch runtime's abort signal and invokes the branch node
   * implementation's `onCancel()` cleanup hook when it is a cancellable node
   * (e.g. `workflow.execute`, which cancels its child workflow). Mirrors the
   * teardown `run_node` performs for a normally-cancelled step. Errors are logged
   * and swallowed so teardown of sibling branches / the parallel step continues;
   * `onCancel` implementations are required to be idempotent.
   */
  private async cancelBranchNode(branchRuntime: StepExecutionRuntime): Promise<void> {
    branchRuntime.abortController.abort();
    const branchImpl = this.nodesFactory.create(branchRuntime);
    await this.runBranchOnCancel(branchImpl);
  }

  /**
   * Invokes a branch node implementation's `onCancel()` cleanup hook when it is a
   * cancellable node (e.g. `workflow.execute`, which cancels its child workflow).
   * Mirrors the teardown `run_node` performs for a normally-cancelled step. Errors
   * are logged and swallowed so teardown of sibling branches / the parallel step
   * continues; `onCancel` implementations are required to be idempotent.
   */
  private async runBranchOnCancel(branchImpl: NodeImplementation): Promise<void> {
    if (!isCancellableNode(branchImpl)) {
      return;
    }
    try {
      await branchImpl.onCancel();
    } catch (onCancelError) {
      this.workflowLogger.logError(
        `Parallel step "${this.node.stepId}": branch onCancel hook failed during timeout cleanup - continuing.`,
        onCancelError instanceof Error ? onCancelError : new Error(String(onCancelError))
      );
    }
  }

  private buildBranchStackFrames(index: number): StackFrame[] {
    return this.buildBranchStackFramesFrom(
      this.wfExecutionRuntimeManager.getCurrentNodeScope(),
      index
    );
  }

  /**
   * Builds a branch's stack frames from an explicit base scope. Used during
   * concurrent advancement so every branch derives from the SAME stable base
   * captured before any branch ran, never a base mutated by a sibling branch's
   * temporary scope install.
   */
  private buildBranchStackFramesFrom(base: StackFrame[], index: number): StackFrame[] {
    return WorkflowScopeStack.fromStackFrames(base).enterScope({
      nodeId: this.node.id,
      nodeType: this.node.type,
      stepId: this.node.stepId,
      scopeId: index.toString(),
    }).stackFrames;
  }

  private computeResumeAt(state: ParallelStepState): Date {
    const now = Date.now();
    let earliest: number | undefined;

    const inFlightBranches = state.branches.filter(
      (branch) => !TERMINAL_BRANCH_STATUSES.has(branch.status)
    );
    for (const branch of inFlightBranches) {
      const branchStackFrames = this.buildBranchStackFrames(branch.index);
      const branchRuntime = this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
        nodeId: branch.currentNodeId ?? this.getBranchStartNodeId(branch.index),
        stackFrames: branchStackFrames,
      });
      const resumeAt = branchRuntime.stepExecution?.state?.resumeAt;
      if (typeof resumeAt === 'string') {
        const ts = new Date(resumeAt).getTime();
        if (!Number.isNaN(ts) && (earliest === undefined || ts < earliest)) {
          earliest = ts;
        }
      }
    }

    if (earliest !== undefined && earliest > now) {
      return new Date(earliest);
    }
    return new Date(now + RETICK_FLOOR_MS);
  }

  private finish(branches: ParallelBranchState[]): void {
    const results: ParallelBranchResult[] = branches.map((branch) => {
      const timing = {
        ...(branch.startedAt !== undefined && { startedAt: branch.startedAt }),
        ...(branch.finishedAt !== undefined && { finishedAt: branch.finishedAt }),
        ...(branch.startedAt !== undefined &&
          branch.finishedAt !== undefined && {
            durationMs: branch.finishedAt - branch.startedAt,
          }),
      };
      // `key` is the item snapshotted at init (per #17835), so correlation is
      // stable regardless of whether `foreach` would re-resolve identically.
      const correlation = {
        index: branch.index,
        ...(branch.key !== undefined && { key: branch.key }),
      };

      // Branches that never started (fail-fast short-circuit) carry no result.
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
      const branchStackFrames = this.buildBranchStackFrames(branch.index);
      const branchRuntime = this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
        // The terminal output/error lives on the last node the branch ran.
        nodeId: branch.currentNodeId ?? this.getBranchStartNodeId(branch.index),
        stackFrames: branchStackFrames,
      });
      const branchResult = branchRuntime.getCurrentStepResult();
      return {
        ...correlation,
        ...timing,
        status: branch.status === 'failed' ? 'failed' : 'completed',
        output: branchResult?.output,
        error: branchResult?.error,
      };
    });

    const succeeded = results.filter((r) => r.status === 'completed').length;
    // Timed-out branches count as failures for the aggregate status.
    const failed = results.filter((r) => r.status === 'failed' || r.status === 'timed_out').length;
    const output: ParallelStepOutput = {
      results,
      total: results.length,
      succeeded,
      failed,
      status: failed > 0 ? 'failed' : 'completed',
    };

    // Static mode (#17834): also expose results keyed by branch name so authors
    // can read `steps.<p>.output.branches.<name>.{status,output,error}`. Names are
    // schema-guaranteed present and unique here, so the map is lossless. Dynamic
    // `foreach` mode keeps only the index-aligned `results[]` (its keys are items,
    // which need not be unique).
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
    // `failStep` sets the workflow-level error; the execution loop's `catchError`
    // then bubbles it up the scope stack, exactly like a failing atomic step. We
    // still navigate to the exit node so the graph cursor is consistent (the
    // mirror of `navigateToNextNode()` on a failing atomic step).
    if (this.resolveMode() === 'fail-fast' && failed > 0) {
      this.stepExecutionRuntime.failStep(this.buildAggregateFailureError(output), output);
      this.wfExecutionRuntimeManager.navigateToNode(this.node.exitNodeId);
      return;
    }

    this.stepExecutionRuntime.finishStep(output);
    this.wfExecutionRuntimeManager.navigateToNode(this.node.exitNodeId);
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
      `Parallel step "${this.node.stepId}" failed (fail-fast): ${output.failed} of ${output.total} ` +
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
    const staticBranches = this.node.branches;
    if (staticBranches === undefined) {
      return undefined;
    }

    // `results` is built as `branches.map(...)` just above, so every branch has a
    // terminal-status result entry here; key the projection off it.
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

  private resolveMode(): ParallelMode {
    return (this.node.configuration.mode as ParallelMode | undefined) ?? DEFAULT_PARALLEL_MODE;
  }

  private resolveTimeoutMs(duration: string | undefined): number | undefined {
    if (!duration) {
      return undefined;
    }
    return parseDuration(duration);
  }

  private resolveConcurrency(): { max: number; countWaiting: boolean } {
    const concurrency = this.node.configuration.concurrency;
    if (concurrency == null) {
      return { max: DEFAULT_PARALLEL_CONCURRENCY, countWaiting: true };
    }
    if (typeof concurrency === 'number') {
      return { max: this.clampConcurrency(concurrency), countWaiting: true };
    }
    const obj = concurrency as ParallelConcurrencyObject;
    return {
      max: this.clampConcurrency(obj.max ?? DEFAULT_PARALLEL_CONCURRENCY),
      countWaiting: obj['count-waiting'] ?? true,
    };
  }

  // Defensive runtime clamp: schema validation already rejects values above the
  // ceiling, but the engine must never let a malformed/legacy definition pin a
  // worker with an unbounded lane count.
  private clampConcurrency(requested: number): number {
    return Math.min(Math.max(1, requested), DEFAULT_PARALLEL_MAX_CONCURRENCY);
  }

  private getItems(): unknown[] {
    const expression = this.node.configuration.foreach;

    if (Array.isArray(expression)) {
      return expression;
    }

    if (!expression) {
      throw new Error(
        `Parallel step "${this.node.stepId}" requires a "foreach" array or expression.`
      );
    }

    let resolved: unknown = isTemplateExpression(expression)
      ? this.stepExecutionRuntime.contextManager.evaluateExpressionInContext(expression)
      : this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(expression);

    // A rendered string is accepted only if it is a JSON array literal (e.g. a
    // template that produced `"[1,2,3]"`). Anything else — a scalar like
    // `"hello"`, or `"{...}"` — is conceptually "foreach is not an array", so we
    // funnel both the parse failure and the non-array result into the SAME clear
    // message instead of leaking a raw JSON parse error to the author.
    if (typeof resolved === 'string') {
      try {
        resolved = JSON.parse(resolved);
      } catch {
        resolved = undefined;
      }
    }

    if (!Array.isArray(resolved)) {
      throw new Error(
        `Parallel step "${this.node.stepId}" foreach expression must evaluate to an array, ` +
          `but "${expression}" did not. Provide a literal array or an expression that resolves to one.`
      );
    }

    return resolved;
  }
}
