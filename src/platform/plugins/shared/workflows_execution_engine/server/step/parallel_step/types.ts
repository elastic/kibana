/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Lifecycle of a single parallel branch (one fan-out item).
 * `skipped` is reserved for branches that never started because a prior branch
 * failed under fail-fast mode.
 */
export type ParallelBranchStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'timed_out';

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
  /** True once the branch body has been started at least once. */
  started: boolean;
  /**
   * Cursor into the branch body subgraph: the next node to run for this branch.
   * Advances through the body's nodes across ticks so a branch may contain more
   * than one step. Undefined until the branch first starts; set to the body's
   * start node on first run, then to each successor as nodes complete.
   */
  currentNodeId?: string;
  /** Epoch ms when the branch first started; used for per-branch timeout. */
  startedAt?: number;
  /** Epoch ms when the branch reached a terminal state. */
  finishedAt?: number;
  /** Set when the branch was terminated by a timeout (overall or per-branch). */
  timedOut?: boolean;
}

/**
 * State persisted on the parallel step execution between durable ticks.
 * Mirrors the durable poll pattern: every non-terminal tick re-enters a wait,
 * every terminal tick finishes the step and writes results.
 */
export interface ParallelStepState extends Record<string, unknown> {
  total: number;
  branches: ParallelBranchState[];
  /** Epoch ms when the parallel step began fanning out; used for overall timeout. */
  startedAt: number;
}

/** A single entry of the index-aligned results array exposed to downstream steps. */
export interface ParallelBranchResult {
  /** Fan-out index, aligned with the input list order. */
  index: number;
  /** The fan-out item for this branch, for correlation in the execution view. */
  key?: unknown;
  status: 'completed' | 'failed' | 'skipped' | 'timed_out';
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
  status: 'completed' | 'failed' | 'skipped' | 'timed_out';
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
