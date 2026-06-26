/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Step types whose outputs must never be evicted from in-memory state,
 * even for non-latest iterations in a loop.
 *
 * - data.set: getVariables reads ALL data.set executions globally, not just the latest
 * - waitForInput: user-provided answers must be preserved for auditability and
 *   downstream access across all loop iterations
 * - enter-X/exit-X scope frame nodes (foreach, while, timeout-zone, retry, etc.):
 *   structural execution state — always small, always needed while their scope is
 *   active. Pinning them ensures they are never evicted and therefore never trigger
 *   SQLite rehydration round-trips inside prepareForRead.
 *
 * Centralised here so eviction (StepIoService) and stale-loop cleanup
 * (WorkflowExecutionState.evictStaleLoopOutputs) share a single source of truth.
 */
export const EVICTION_EXEMPT_STEP_TYPES: ReadonlySet<string> = new Set([
  'data.set',
  'waitForInput',
  // Scope-frame wrapper nodes — structural, never user-data payloads
  'enter-foreach',
  'exit-foreach',
  'enter-while',
  'exit-while',
  'enter-timeout-zone',
  'exit-timeout-zone',
  'enter-retry',
  'exit-retry',
  'enter-try-block',
  'exit-try-block',
  'enter-continue',
  'exit-continue',
  'enter-fallback-path',
  'exit-fallback-path',
]);

/**
 * Step types that act as loop containers. Used by resume-time stale-iteration
 * cleanup to identify which completed steps' inner outputs are now safe to
 * drop. Kept next to the eviction-exempt set so all "step-type-aware
 * eviction policy" knobs live in one file.
 */
export const LOOP_STEP_TYPES: ReadonlySet<string> = new Set(['foreach', 'while']);
