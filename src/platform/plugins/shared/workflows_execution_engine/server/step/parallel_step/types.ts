/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The terminal states a branch can settle in. `skipped` is reserved for branches
 * that never started because a prior branch failed under fail-fast mode.
 */
export type ParallelTerminalBranchStatus = 'completed' | 'failed' | 'skipped' | 'timed_out';

/**
 * Lifecycle of a single parallel branch (one fan-out item): the terminal states
 * plus the two in-flight states the durable tick tracks.
 */
type ParallelBranchStatus = ParallelTerminalBranchStatus | 'pending' | 'running';

/**
 * Per-branch bookkeeping persisted in the parallel step's own step state.
 * The durable-tick node owns this array; it is the source of truth for both
 * resume-across-ticks and the index-aligned results contract.
 */
export interface ParallelBranchState extends Record<string, unknown> {
  /** Fan-out index; also the branch scopeId. */
  index: number;
  /**
   * The fan-out item for this branch, snapshotted at init from the resolved
   * `foreach` list. Persisted per branch (not re-evaluated at finish) so the
   * result `key` cannot drift if the `foreach` expression resolves to a
   * different value on a later tick.
   */
  key?: unknown;
  status: ParallelBranchStatus;
  /**
   * The execution running this branch's body, set once the branch is launched.
   * Equals the branch's wrapper step execution id in the parent, so it is
   * re-derivable rather than allocated — a fan-out retried after a crash finds
   * the children it already created instead of duplicating them.
   */
  executionId?: string;
  /** Epoch ms when the branch was launched. */
  startedAt?: number;
  /** Epoch ms when the branch reached a terminal state. */
  finishedAt?: number;
  /** Set when the branch was terminated by a timeout (overall or per-branch). */
  timedOut?: boolean;
  /**
   * True while the branch execution is parked in a wait rather than actively
   * running. Used by concurrency accounting: with `count-waiting: false`, parked
   * branches free their slot so a queued branch can begin, while actively
   * running branches still count against `max`.
   */
  waiting?: boolean;
}

/**
 * State persisted on the parallel step execution. Written by the enter node at
 * fan-out and updated by the exit node on every join pass; both nodes resolve to
 * the same step execution, so they read and write the same record.
 */
export interface ParallelStepState extends Record<string, unknown> {
  total: number;
  branches: ParallelBranchState[];
  /** Epoch ms when the parallel step began fanning out. */
  startedAt: number;
  /**
   * True for static scatter-gather (`branches`) mode, where each branch `key` is
   * an author-chosen name. False for dynamic `foreach` fan-out, where `key` is
   * the snapshotted item (which may be arbitrary/long data). The execution view
   * uses this to decide whether the branch `key` is a meaningful display label
   * (static) or whether it should fall back to the fan-out index (dynamic).
   */
  static: boolean;
}

/** A single entry of the index-aligned results array exposed to downstream steps. */
export interface ParallelBranchResult {
  /** Fan-out index, aligned with the input list order. */
  index: number;
  /** The fan-out item for this branch, for correlation in the execution view. */
  key?: unknown;
  status: ParallelTerminalBranchStatus;
  output?: unknown;
  error?: unknown;
  /** Epoch ms when the branch started, when known. */
  startedAt?: number;
  /** Epoch ms when the branch reached a terminal state, when known. */
  finishedAt?: number;
  /** Branch wall-clock duration in ms, when both timestamps are known. */
  durationMs?: number;
}

/**
 * A single branch's result keyed by branch name in the static aggregate
 * projection. Mirrors `{ status, output, error }` from the ticket contract
 * (#17834) so authors can read `steps.<p>.output.branches.<name>.output`.
 */
export interface ParallelNamedBranchResult {
  status: ParallelTerminalBranchStatus;
  output?: unknown;
  error?: unknown;
}

/** Aggregate output of a parallel step. */
export interface ParallelStepOutput extends Record<string, unknown> {
  results: ParallelBranchResult[];
  total: number;
  succeeded: number;
  failed: number;
  status: 'completed' | 'failed';
  /**
   * Static mode only: results keyed by branch name, matching the #17834
   * contract (`steps.<p>.output.branches.<name>.{status,output,error}`). Absent
   * in dynamic `foreach` mode (where keys are items, not unique names) — use
   * the index-aligned `results[]` there instead.
   */
  branches?: Record<string, ParallelNamedBranchResult>;
}
