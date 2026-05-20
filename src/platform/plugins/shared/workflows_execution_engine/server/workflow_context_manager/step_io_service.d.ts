import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { SerializedError } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepIoStateAccessor } from './workflow_execution_state';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
/**
 * Resolves predecessors for a node — supplied at call time so the service
 * does not need to depend on `WorkflowGraph` directly.
 */
export type PredecessorsResolver = (node: GraphNodeUnion) => ReadonlyArray<GraphNodeUnion>;
export interface StepIoServiceInit {
    stepRepository: StepExecutionRepository;
    state: StepIoStateAccessor;
    pinnedStepTypes?: ReadonlySet<string>;
    /**
     * Minimum output size in bytes for a completed step to be eligible for eviction.
     * 0 = evict all completed step outputs. `Infinity` = disable eviction entirely.
     */
    evictionMinBytes?: number;
    logger?: Logger;
}
export interface PrepareForReadArgs {
    node: GraphNodeUnion;
    predecessorsResolver: PredecessorsResolver;
}
/**
 * Read-only IO surface used by node implementations and the context manager.
 * Constructor-inject this (instead of the full service) into consumers that
 * have no business mutating step state — the compiler then prevents an
 * accidental `flush()` or eviction call from a node implementation.
 */
export interface StepIoReader {
    getStepOutput(stepExecutionId: string): JsonValue | null | undefined;
    getStepInput(stepExecutionId: string): JsonValue | undefined;
    getStepError(stepExecutionId: string): SerializedError | undefined;
    getLatestStepIO(stepId: string): {
        input: JsonValue | undefined;
        output: JsonValue | null | undefined;
        error: SerializedError | undefined;
    } | undefined;
    getDataSetVariables(): Record<string, unknown>;
}
/**
 * Reader + write surface used by the per-step runtime. Owns step IO data
 * (input/output) only — lifecycle metadata (status, finishedAt, error,
 * executionTimeMs, scopeStack) is the runtime's responsibility and goes
 * through `WorkflowExecutionState.upsertStep` directly. Splitting the
 * concerns keeps each writer focused: lifecycle is the runtime's job, IO
 * is the service's.
 */
export interface StepIoWriter extends StepIoReader {
    setStepInput(stepExecutionId: string, input: JsonValue): void;
    /**
     * Writes a step's output to the IO map and queues it for the next flush.
     * Optionally records the byte size for eviction/telemetry — pass
     * `sizeBytes` when the caller already measured the payload (Layer 2
     * enforcement) so we don't pay for a second `JSON.stringify`.
     */
    setStepOutput(stepExecutionId: string, output: JsonValue | null, sizeBytes?: number): void;
}
/**
 * Lifecycle surface used by the workflow execution loop and runtime manager.
 * Includes flush/load/eviction/rehydration entry points that node code must
 * never call. Kept disjoint from {@link StepIoReader} on purpose — a loop
 * step impl should not be able to drive a flush or evict outputs.
 */
export interface StepIoLifecycle {
    flush(): Promise<void>;
    flushStepChanges(): Promise<void>;
    load(): Promise<void>;
    prepareForRead(args: PrepareForReadArgs): Promise<void>;
    releaseTransientlyRehydratedOutputs(): void;
    evictStaleLoopOutputs(innerStepIds: Iterable<string>): void;
    evictCompletedLoopsOnResume(graph: {
        getInnerStepIds(loopStepId: string): Iterable<string>;
    }): void;
    hasEvictedOutputs(): boolean;
    getOutputSizeStats(): OutputSizeStats;
}
/**
 * Owns the IO lifecycle of a workflow run.
 *
 * Holds the canonical `inputs` / `outputs` maps in-house — `WorkflowExecutionState`
 * stores only step *metadata* (status, scopeStack, error, indices, etc.).
 * The two domains are merged at flush time: the service drains state's
 * pending lifecycle partials, joins them with its own IO partials by step
 * id, and runs a single `bulkUpsert` per cycle.
 *
 * Responsibilities:
 *   - in-memory `input`/`output` storage and reads
 *   - output size accounting for telemetry (`getOutputSizeStats`)
 *   - deferred output eviction (one-cycle deferral after flush)
 *   - immediate input eviction post-flush for terminal steps
 *   - on-demand rehydration of evicted outputs from ES
 *   - resume-time output orchestration (`load()`)
 *   - stale-loop iteration cleanup
 *   - bulk-upsert of merged lifecycle + IO partials
 *
 * Dependency direction: state → workflowExecutionRepository;
 * service → state (via narrow `StepIoStateAccessor`) and
 * stepExecutionRepository.
 */
export declare class StepIoService implements StepIoWriter, StepIoLifecycle {
    private readonly stepRepository;
    private readonly state;
    private readonly pinnedStepTypes;
    private readonly evictionMinBytes;
    private readonly logger?;
    /** Per-step input. Cleared post-flush for terminal steps (input eviction). */
    private readonly inputs;
    /**
     * Per-step output. `null` means FAILED (semantically distinct from absent).
     * Absent means evicted (or never set yet).
     */
    private readonly outputs;
    /**
     * Pending IO partials for the next bulk-upsert. Decoupled from the
     * canonical `inputs` / `outputs` maps so eviction (which clears the
     * canonical maps) does NOT remove a write from the in-flight flush
     * payload — eviction is memory-only by contract; the doc keeps the
     * original value on disk.
     */
    private pendingIoChanges;
    /**
     * Every step execution id whose `output` has been evicted from memory.
     * Reads against this Set are the authoritative "is this output evicted?"
     * answer — used by {@link hasEvictedOutputs} and the rehydration filter.
     */
    private readonly evictedOutputIds;
    /**
     * Sizes for evicted outputs that we actually measured. Resume-time
     * deferred outputs land in {@link evictedOutputIds} only — their size is
     * unknown and *deliberately not* recorded as 0 here, because that would
     * pollute {@link getOutputSizeStats} with phantom zero-entries.
     */
    private readonly evictedOutputSizes;
    /** Recorded output sizes (Layer 2 enforcement). Used to gate eviction eligibility. */
    private readonly outputSizes;
    /**
     * Running sum of every value held in {@link outputSizes} and
     * {@link evictedOutputSizes}. Maintained in lockstep with the two maps via
     * {@link setOutputSize} / {@link clearOutputSize} / {@link setEvicted} /
     * {@link clearEvicted} so {@link getOutputSizeStats} runs in `O(1)`
     * instead of iterating both maps on every call (the telemetry layer calls
     * this once per flush).
     */
    private totalRecordedBytes;
    /** IDs queued for eviction on the NEXT flush cycle (one-cycle deferral). */
    private pendingOutputEvictionIds;
    /**
     * IDs that the most recent `prepareForRead` had to rehydrate from ES. Used
     * by `releaseTransientlyRehydratedOutputs` to drop those outputs back to
     * the evicted state once the consuming step has finished, so resume tasks
     * don't progressively grow in-memory state by accumulating predecessor
     * outputs they only briefly needed.
     */
    private transientlyRehydratedIds;
    /**
     * Per-execution `data.set` output, keyed by step execution id. Populated
     * incrementally on every `data.set` write (via `setStepOutput`) and on
     * resume (via `load()`). Iteration order is insertion order, which equals
     * `globalExecutionIndex` order on both fresh and resumed workflows — the
     * underlying `state.stepExecutions` is itself an insertion-ordered Map
     * driven by `globalExecutionIndex`-assigning `createStep` calls, and the
     * resume path replays the workflow's `stepExecutionIds` array in the same
     * order. That means `getDataSetVariables()` can walk this map directly
     * with no sort, in `O(K)` where K = number of `data.set` executions.
     */
    private readonly dataSetOutputs;
    /**
     * Memoised aggregation of {@link dataSetOutputs}. Invalidated on every
     * `data.set` write — that is what makes the read path cheap in the common
     * case (the same context manager calls `getVariables` 5–10× per step but
     * the underlying data only changes when a `data.set` step runs).
     */
    private dataSetVariablesCache;
    constructor(init: StepIoServiceInit);
    getStepOutput(stepExecutionId: string): JsonValue | null | undefined;
    getStepInput(stepExecutionId: string): JsonValue | undefined;
    getStepError(stepExecutionId: string): SerializedError | undefined;
    /**
     * Returns the input/output/error of the latest execution of `stepId`, or
     * `undefined` when the step has not run.
     */
    getLatestStepIO(stepId: string): {
        input: JsonValue | undefined;
        output: JsonValue | null | undefined;
        error: SerializedError | undefined;
    } | undefined;
    /**
     * Aggregates outputs from all `data.set` step executions in execution
     * order. `data.set` is pinned (never evicted), so this read does not need
     * rehydration. Walks {@link dataSetOutputs} in insertion order (which
     * matches `globalExecutionIndex` order) — `O(K)` where K is the number of
     * `data.set` executions, not the total number of step executions. The
     * result is memoised because the same context manager calls
     * `getVariables()` 5–10× per step.
     */
    getDataSetVariables(): Record<string, unknown>;
    /**
     * Records a `data.set` write into the incremental index and invalidates
     * the memoised aggregation. Inserts on first write so the map's insertion
     * order matches `globalExecutionIndex` order; subsequent writes (e.g.
     * retries) update the value in place without changing the order.
     */
    private recordDataSetOutput;
    setStepInput(stepExecutionId: string, input: JsonValue): void;
    /**
     * Writes a step's output to the IO map and marks it dirty for the next
     * flush. Lifecycle fields (status, finishedAt, error, etc.) are the
     * caller's responsibility and go through `state.upsertStep`.
     *
     * Atomicity with the lifecycle write is preserved because both writes
     * happen synchronously on the same tick — the persistence loop runs on a
     * separate microtask chain and cannot interleave between them. The flush
     * orchestrator merges state's lifecycle partials with the IO partials so
     * the bulk-upsert receives one combined entry per step id.
     *
     * `output: null` is the FAILED-step sentinel; the eviction layer
     * distinguishes it from `undefined` (evicted) so do not coerce. `sizeBytes`
     * is optional — pass it when Layer 2 has already measured the payload so
     * the eviction predicate can decide without re-serialising.
     */
    setStepOutput(stepExecutionId: string, output: JsonValue | null, sizeBytes?: number): void;
    /**
     * Aggregate output size statistics across active and evicted steps. `O(1)`:
     * the running counter is maintained in lockstep with every write to
     * {@link outputSizes} / {@link evictedOutputSizes}, so this is safe
     * to call from a hot path (e.g. the persistence-loop telemetry tick).
     */
    getOutputSizeStats(): OutputSizeStats;
    hasEvictedOutputs(): boolean;
    /**
     * Writes a recorded size into {@link outputSizes} and keeps the running
     * total in sync. Idempotent on rewrites — the previous value is subtracted
     * before the new one is added.
     */
    private setOutputSize;
    /** Removes a recorded size and decrements the running total. */
    private clearOutputSize;
    /**
     * Marks a step output as evicted and, when a size is provided, records it
     * for the telemetry running total. Pass `undefined` (or omit) to mark a
     * resume-deferred eviction whose size is genuinely unknown — those are
     * tracked in {@link evictedOutputIds} only, never as phantom-zero entries
     * in the size map.
     */
    private setEvicted;
    /**
     * Clears the eviction tracking for a step (Set membership + size entry if
     * we had one). Decrements the running total only when a size had been
     * recorded.
     */
    private clearEvicted;
    /**
     * Flushes pending step-doc and workflow-doc changes to Elasticsearch and
     * runs IO bookkeeping (deferred output eviction + immediate input eviction)
     * on the freshly-flushed step IDs.
     */
    flush(): Promise<void>;
    /**
     * Step-doc-only flush. Drains state's pending lifecycle partials, merges
     * with this service's IO partials, and runs the combined bulk-upsert. Then
     * processes the deferred output-eviction cycle and immediate input
     * eviction. Even when there are no doc changes this still drains the
     * previous cycle's eviction queue — the deferral is one cycle, not one
     * bulk-upsert.
     */
    flushStepChanges(): Promise<void>;
    /**
     * Resume-time entry point. Asks the repository for step metadata without
     * the (potentially large) `output` field, hands it to state, then eagerly
     * fetches outputs for pinned step types (data.set, waitForInput) so they
     * are immediately available without rehydration. Non-pinned steps are
     * marked deferred — their outputs will be rehydrated on demand by
     * `prepareForRead`.
     */
    load(): Promise<void>;
    /**
     * Drops in-memory IO from non-latest executions of the given step IDs.
     * Used by foreach/while exit + loop break/continue to release memory after
     * an iteration completes. Memory-only — ES docs untouched. Pinned step
     * types and the latest execution per stepId are preserved.
     */
    evictStaleLoopOutputs(innerStepIds: Iterable<string>): void;
    /**
     * Re-applies stale-iteration eviction for loops that completed before the
     * workflow suspended. Called from `WorkflowExecutionRuntimeManager.resume()`
     * after `load()` so resume tasks don't carry the full output of every past
     * loop iteration in memory — matching the in-memory state the initial task
     * had at the point of suspension.
     *
     * De-duplicates by stepId because nested loops produce one execution per
     * outer iteration, all COMPLETED — `getInnerStepIds` is per stepId.
     */
    evictCompletedLoopsOnResume(graph: Pick<WorkflowGraph, 'getInnerStepIds'>): void;
    /**
     * Pre-warms the in-memory state by rehydrating any evicted step outputs
     * that the upcoming step's context build will need. Targeted via static
     * template analysis (`extractReferencedStepIds`); falls back to all
     * predecessors when the analysis is ambiguous (dynamic bracket access,
     * etc.). Also rehydrates scope-stack entries used by
     * `enrichStepContextAccordingToStepScope`.
     *
     * **Deferred-release semantics.** Outputs rehydrated for the *previous*
     * step are released here, not at the end of the previous step's run.
     * That lets us keep predecessors resident across consecutive consumers
     * (fanout pattern: A → B, A → C, A → D — A stays in memory through C and
     * D instead of being re-fetched each time) and removes the need for a
     * "skip release on retry" hack: a retry attempt's `prepareForRead` will
     * recompute the same `neededIds` and naturally retain the same outputs.
     *
     * Workflow-end cleanup is handled by `releaseTransientlyRehydratedOutputs`
     * called from the execution loop's final-flush path.
     *
     * No-op (zero ES calls) when nothing is evicted and nothing is transiently
     * rehydrated from a previous step.
     */
    prepareForRead({ node, predecessorsResolver }: PrepareForReadArgs): Promise<void>;
    /**
     * Resolves the set of step execution IDs whose outputs need to be rehydrated
     * before the upcoming context build. Combines:
     *
     * 1. Template-referenced steps. Static analysis returns either:
     *    - a `Set<string>` of step IDs that the node's templates reference,
     *    - or `null` when bracket access defeats static analysis.
     *
     * 2. Active scope-stack frames consumed by `enrichStepContextAccordingToStepScope`.
     *
     * **Conservative fallback.** When the static analysis returns an empty set
     * but evicted outputs exist among the predecessors, we fall back to
     * rehydrating all predecessors. This guards against the analysis missing
     * a template reference (new node shape, unknown configuration key) — a
     * miss would otherwise produce `undefined` at template render time and
     * silently corrupt downstream step IO.
     */
    private computeRehydrationTargets;
    private hasEvictedPredecessor;
    /**
     * Releases all transiently-rehydrated outputs unconditionally. Used at
     * workflow-end (final flush) as a safety net — by that point no further
     * `prepareForRead` is going to run, so any IDs left in the transient set
     * are dead weight.
     *
     * Memory-only: the doc is already on disk (it was evicted before we
     * rehydrated), so we just mark it evicted again and clear it from the
     * outputs map. Idempotent — calling with no transient rehydrations is a
     * no-op.
     */
    releaseTransientlyRehydratedOutputs(): void;
    /**
     * Releases transiently-rehydrated outputs that are *not* in `keepIds`,
     * leaving the kept ones resident for the next consumer.
     *
     * Called from `prepareForRead` to implement the deferred-release pattern:
     * the next step computes its `neededIds` first, then we drop only the
     * previous step's transient IDs that the next step does not need. Pass
     * `undefined` to release everything (workflow-end cleanup).
     *
     * Re-eviction is identical to eviction except the threshold gate does
     * not apply — the output is known to have been evictable since it came
     * back from ES. Pinned step types still cannot be re-evicted (guarded
     * by `isReleaseCandidate`).
     */
    private releaseTransientExcept;
    /**
     * Re-fetches evicted output fields from Elasticsearch for the requested
     * step execution IDs. Only IDs that are actually evicted are fetched; if
     * none are, this is a no-op with zero ES calls.
     *
     * Defensively removes IDs not returned by ES so we don't loop forever
     * trying to rehydrate a doc that has been deleted/ILM'd. Logs `error`
     * (not `warn`) when the workflow is still RUNNING — that's the only
     * scenario where a missing evicted doc indicates active data loss.
     */
    rehydrateOutputs(stepExecutionIds: ReadonlyArray<string>): Promise<void>;
    /**
     * Drains state's pending lifecycle partials, joins them with this service's
     * IO partials by step id, and runs the bulk-upsert. Returns the set of ids
     * actually persisted (used by the deferred-eviction cycle).
     *
     * IO is included in the upsert only when the step had a write since the
     * last flush — eviction-only events do not re-upsert the output.
     */
    private persistMergedStepChanges;
    /**
     * Marks non-pinned step outputs as deferred (rehydrated on demand) and
     * returns the IDs of pinned step types whose outputs the service should
     * eagerly mget.
     */
    private markDeferredAfterLoad;
    /**
     * Drains the previous cycle's deferred output evictions, queues this
     * cycle's flushed IDs for next-cycle eviction, and runs immediate input
     * eviction on terminal steps. Called with `[]` when the flush had no doc
     * changes — the queue must still be drained on its scheduled cycle.
     */
    private runDeferredEvictionCycle;
    /**
     * Drops in-memory IO without marking the step as rehydratable from ES.
     * Used by `evictStaleLoopOutputs` for non-latest loop executions whose
     * output and input no caller will ever read again — there's no value in
     * paying an ES round-trip to bring them back. Pinned-type guards live
     * here so the loop-cleanup caller doesn't have to know the rules.
     */
    private dropStaleStepIo;
    private evictCompletedStepOutputs;
    private evictCompletedStepInputs;
    private isEvictionCandidate;
    /**
     * Eligibility check for releasing a transiently rehydrated output back to
     * the evicted state. Same shape as {@link isEvictionCandidate} minus the
     * size threshold — the output already met the threshold the first time it
     * was evicted, so it remains eligible regardless of recorded size.
     */
    private isReleaseCandidate;
}
