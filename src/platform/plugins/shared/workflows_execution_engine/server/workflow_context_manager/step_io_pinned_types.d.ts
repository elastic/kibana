/**
 * Step types whose outputs must never be evicted from in-memory state,
 * even for non-latest iterations in a loop.
 *
 * - data.set: getVariables reads ALL data.set executions globally, not just the latest
 * - waitForInput: user-provided answers must be preserved for auditability and
 *   downstream access across all loop iterations
 *
 * Centralised here so eviction (StepIoService) and stale-loop cleanup
 * (WorkflowExecutionState.evictStaleLoopOutputs) share a single source of truth.
 */
export declare const EVICTION_EXEMPT_STEP_TYPES: ReadonlySet<string>;
/**
 * Step types that act as loop containers. Used by resume-time stale-iteration
 * cleanup to identify which completed steps' inner outputs are now safe to
 * drop. Kept next to the eviction-exempt set so all "step-type-aware
 * eviction policy" knobs live in one file.
 */
export declare const LOOP_STEP_TYPES: ReadonlySet<string>;
