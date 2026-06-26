/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { EsWorkflowStepExecution, SerializedError } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { CacheTier } from './sqlite_cache/cache_tier';
import { NoopCacheTier } from './sqlite_cache/cache_tier';
import { EVICTION_EXEMPT_STEP_TYPES, LOOP_STEP_TYPES } from './step_io_pinned_types';
import type { StepExecutionMetadata, StepIoStateAccessor } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import { safeOutputSize } from '../step/errors';
import { buildStepExecutionId } from '../utils';

/**
 * Resolves predecessors for a node — supplied at call time so the service
 * does not need to depend on `WorkflowGraph` directly.
 */
export type PredecessorsResolver = (node: GraphNodeUnion) => ReadonlyArray<GraphNodeUnion>;

export interface StepIoServiceInit {
  stepRepository: StepExecutionRepository;
  state: StepIoStateAccessor;
  pinnedStepTypes?: ReadonlySet<string>;
  logger?: Logger;
  /** Off-heap read cache. Defaults to NoopCacheTier (no-op) when omitted. */
  cacheTier?: CacheTier;
  /**
   * When true and the compiled graph node carries `dataStepDependencies`,
   * prepareForRead loads only those predecessor outputs instead of all
   * transitive predecessors. Requires cacheTier.spills=true to have effect.
   * Default false (conservative fallback — load everything).
   */
  selectiveRehydration?: boolean;
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
  getLatestStepIO(stepId: string):
    | {
        input: JsonValue | undefined;
        output: JsonValue | null | undefined;
        error: SerializedError | undefined;
      }
    | undefined;
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
  evictStaleLoopOutputs(innerStepIds: Iterable<string>): void;
  evictCompletedLoopsOnResume(graph: {
    getInnerStepIds(loopStepId: string): Iterable<string>;
  }): void;
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
 *   - immediate input eviction post-flush for terminal steps
 *   - on-demand rehydration from SQLite / ES when spills are enabled
 *   - resume-time output orchestration (`load()`)
 *   - stale-loop iteration cleanup
 *   - bulk-upsert of merged lifecycle + IO partials
 *
 * Dependency direction: state → workflowExecutionRepository;
 * service → state (via narrow `StepIoStateAccessor`) and
 * stepExecutionRepository.
 */
export class StepIoService implements StepIoWriter, StepIoLifecycle {
  private readonly stepRepository: StepExecutionRepository;
  private readonly state: StepIoStateAccessor;
  private readonly pinnedStepTypes: ReadonlySet<string>;
  private readonly logger?: Logger;
  private readonly cacheTier: CacheTier;
  private readonly selectiveRehydration: boolean;

  // ----- Canonical IO storage ----------------------------------------------
  // These maps are the source of truth for step input/output. State holds
  // metadata only. The bulk-upsert at flush time merges the two halves.

  /** Per-step input. Cleared post-flush for terminal steps (input eviction). */
  private readonly inputs = new Map<string, JsonValue>();
  /**
   * Per-step output. `null` means FAILED (semantically distinct from absent).
   * When `cacheTier.spills=false` (RAM-only): absent means never-set.
   * When `cacheTier.spills=true` (SQLite spill): absent means spilled to
   * SQLite / ES and not yet rehydrated.
   */
  private readonly outputs = new Map<string, JsonValue | null>();
  /**
   * Pending IO partials for the next bulk-upsert. Decoupled from the
   * canonical `inputs` / `outputs` maps so eviction (which clears the
   * canonical maps) does NOT remove a write from the in-flight flush
   * payload — eviction is memory-only by contract; the doc keeps the
   * original value on disk.
   */
  private pendingIoChanges = new Map<string, { input?: JsonValue; output?: JsonValue | null }>();

  /** Recorded output sizes (Layer 2 enforcement). Used for telemetry. */
  private readonly outputSizes = new Map<string, number>();
  /**
   * Step execution IDs whose output was loaded into {@link outputs} by
   * {@link rehydrateOutputs} (sourced from SQLite / ES, not written via
   * {@link setStepOutput}). Snapshotted at the start of each flush cycle and
   * evicted from heap at flush end by {@link evictFlushedTransients}, giving
   * all steps that execute within the same flush window a chance to read
   * them without a second SQLite round-trip.
   *
   * Only populated when `cacheTier.spills=true`.
   */
  private readonly transientIds = new Set<string>();
  /**
   * Running sum of every value held in {@link outputSizes}. Maintained in
   * lockstep with the map via {@link setOutputSize} so
   * {@link getOutputSizeStats} runs in `O(1)`.
   */
  private totalRecordedBytes = 0;

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
  private readonly dataSetOutputs = new Map<string, JsonValue | null>();
  /**
   * Memoised aggregation of {@link dataSetOutputs}. Invalidated on every
   * `data.set` write — that is what makes the read path cheap in the common
   * case (the same context manager calls `getVariables` 5–10× per step but
   * the underlying data only changes when a `data.set` step runs).
   */
  private dataSetVariablesCache: Record<string, unknown> | undefined;

  constructor(init: StepIoServiceInit) {
    this.stepRepository = init.stepRepository;
    this.state = init.state;
    this.pinnedStepTypes = init.pinnedStepTypes ?? EVICTION_EXEMPT_STEP_TYPES;
    this.logger = init.logger;
    this.cacheTier = init.cacheTier ?? new NoopCacheTier();
    this.selectiveRehydration = init.selectiveRehydration ?? false;
  }

  // ----- IO reads -----------------------------------------------------------
  // The service is the single chokepoint for IO reads as well as writes:
  // every consumer of step `input`/`output`/`error` goes through here, so any
  // future read-side concern (lazy rehydration, redaction, schema evolution)
  // has exactly one place to land.

  public getStepOutput(stepExecutionId: string): JsonValue | null | undefined {
    if (!this.outputs.has(stepExecutionId)) {
      // Permanent canary: when spilling is active and an output is accessed but
      // was not rehydrated, it either means the compile-time allowlist missed a
      // dependency or a cross-node resume gap. Log at ERROR so it is visible in
      // logs immediately — this fires regardless of the selectiveRehydration flag.
      if (this.cacheTier.spills) {
        this.logger?.error(
          `Step output accessed but not rehydrated (evicted and not loaded): stepExecutionId=${stepExecutionId}. ` +
            `Check dataStepDependencies on the compiled graph node for the accessing step, or verify cross-node resume loaded all required outputs.`
        );
      }
      return undefined;
    }
    return this.outputs.get(stepExecutionId);
  }

  public getStepInput(stepExecutionId: string): JsonValue | undefined {
    return this.inputs.get(stepExecutionId);
  }

  public getStepError(stepExecutionId: string): SerializedError | undefined {
    return this.state.getStepExecution(stepExecutionId)?.error;
  }

  /**
   * Returns the input/output/error of the latest execution of `stepId`, or
   * `undefined` when the step has not run.
   */
  public getLatestStepIO(stepId: string):
    | {
        input: JsonValue | undefined;
        output: JsonValue | null | undefined;
        error: SerializedError | undefined;
      }
    | undefined {
    const latest = this.state.getLatestStepExecution(stepId);
    if (!latest) {
      return undefined;
    }
    return {
      input: this.getStepInput(latest.id),
      output: this.getStepOutput(latest.id),
      error: latest.error,
    };
  }

  /**
   * Aggregates outputs from all `data.set` step executions in execution
   * order. `data.set` is pinned (never evicted), so this read does not need
   * rehydration. Walks {@link dataSetOutputs} in insertion order (which
   * matches `globalExecutionIndex` order) — `O(K)` where K is the number of
   * `data.set` executions, not the total number of step executions. The
   * result is memoised because the same context manager calls
   * `getVariables()` 5–10× per step.
   */
  public getDataSetVariables(): Record<string, unknown> {
    if (this.dataSetVariablesCache !== undefined) {
      return this.dataSetVariablesCache;
    }
    const result: Record<string, unknown> = {};
    for (const output of this.dataSetOutputs.values()) {
      if (output != null && typeof output === 'object' && !Array.isArray(output)) {
        Object.assign(result, output);
      }
    }
    this.dataSetVariablesCache = result;
    return result;
  }

  /**
   * Records a `data.set` write into the incremental index and invalidates
   * the memoised aggregation. Inserts on first write so the map's insertion
   * order matches `globalExecutionIndex` order; subsequent writes (e.g.
   * retries) update the value in place without changing the order.
   */
  private recordDataSetOutput(stepExecutionId: string, output: JsonValue | null): void {
    this.dataSetOutputs.set(stepExecutionId, output);
    this.dataSetVariablesCache = undefined;
  }

  // ----- IO writes ----------------------------------------------------------

  public setStepInput(stepExecutionId: string, input: JsonValue): void {
    this.inputs.set(stepExecutionId, input);
    const existing = this.pendingIoChanges.get(stepExecutionId) ?? {};
    existing.input = input;
    this.pendingIoChanges.set(stepExecutionId, existing);
  }

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
  public setStepOutput(
    stepExecutionId: string,
    output: JsonValue | null,
    sizeBytes?: number
  ): void {
    if (this.state.getStepExecution(stepExecutionId)?.stepType === 'data.set') {
      this.recordDataSetOutput(stepExecutionId, output);
    }
    if (sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes >= 0) {
      this.setOutputSize(stepExecutionId, sizeBytes);
    }
    this.outputs.set(stepExecutionId, output);
    const existing = this.pendingIoChanges.get(stepExecutionId) ?? {};
    existing.output = output;
    this.pendingIoChanges.set(stepExecutionId, existing);
    // Off-heap spill (SQLite mode only): fire-and-forget; ES write is always unconditional
    if (this.cacheTier.spills) {
      this.cacheTier.put(stepExecutionId, output);
    }
  }

  // ----- Size tracking & telemetry ------------------------------------------

  /**
   * Aggregate output size statistics for telemetry. `O(1)`: the running
   * counter is maintained in lockstep with every write to {@link outputSizes}
   * so this is safe to call from a hot path (e.g. the persistence-loop
   * telemetry tick).
   */
  public getOutputSizeStats(): OutputSizeStats {
    return {
      totalBytes: this.totalRecordedBytes,
      stepCount: this.outputSizes.size,
    };
  }

  /**
   * Writes a recorded size into {@link outputSizes} and keeps the running
   * total in sync. Idempotent on rewrites — the previous value is subtracted
   * before the new one is added.
   */
  private setOutputSize(stepExecutionId: string, sizeBytes: number): void {
    const previous = this.outputSizes.get(stepExecutionId) ?? 0;
    this.outputSizes.set(stepExecutionId, sizeBytes);
    this.totalRecordedBytes += sizeBytes - previous;
  }

  /** Removes a recorded size and decrements the running total. */
  private clearOutputSize(stepExecutionId: string): void {
    const previous = this.outputSizes.get(stepExecutionId);
    if (previous === undefined) return;
    this.outputSizes.delete(stepExecutionId);
    this.totalRecordedBytes -= previous;
  }

  // ----- Lifecycle (public entry points) -----------------------------------

  /**
   * Flushes pending step-doc and workflow-doc changes to Elasticsearch and
   * runs IO bookkeeping (output eviction + immediate input eviction) on the
   * freshly-flushed step IDs.
   */
  public async flush(): Promise<void> {
    await Promise.all([this.state.flushWorkflowDoc(), this.flushStepChanges()]);
  }

  /**
   * Step-doc-only flush. Drains state's pending lifecycle partials, merges
   * with this service's IO partials, and runs the combined bulk-upsert. Then
   * processes output eviction (SQLite spill mode only) and immediate input
   * eviction.
   */
  public async flushStepChanges(): Promise<void> {
    // Snapshot transient IDs before the async write. Any output rehydrated
    // by prepareForRead stays in memory until this flush completes — steps
    // that run in the same ~500 ms window find it in this.outputs without a
    // second SQLite round-trip. At flush end the snapshot is swept out.
    const transientSnapshot = this.cacheTier.spills ? new Set(this.transientIds) : undefined;

    const { flushedIds, outputFlushedIds } = await this.persistMergedStepChanges();

    if (this.cacheTier.spills) {
      this.evictFlushedOutputs(outputFlushedIds);
      this.evictFlushedTransients(transientSnapshot!);
    }
    this.evictCompletedStepInputs(flushedIds);
  }

  /**
   * Resume-time entry point. Asks the repository for step metadata without
   * the (potentially large) `output` field, hands it to state, then eagerly
   * fetches outputs for a mode-determined set of steps:
   *
   * - `spills=false` (RAM-only): all step outputs are loaded into memory so
   *   nothing is absent after resume — `prepareForRead` is a no-op.
   * - `spills=true` (SQLite spill): only pinned step types (data.set,
   *   waitForInput) are loaded; everything else stays absent and is
   *   rehydrated on demand by `prepareForRead` (SQLite → ES cold fallback).
   */
  public async load(): Promise<void> {
    this.dataSetOutputs.clear();
    this.dataSetVariablesCache = undefined;

    const stepExecutionIds = this.state.getWorkflowExecutionStepExecutionIds();
    if (!stepExecutionIds) {
      throw new Error(
        'StepIoService: Workflow execution must have step execution IDs to be loaded'
      );
    }

    const foundSteps = await this.stepRepository.getStepExecutionsByIds(
      stepExecutionIds,
      undefined,
      ['output']
    );

    // Capture inputs and hand `output`-stripped metadata to state. The
    // `output` sourceExclude above should already drop output from the
    // wire, but stripping defensively guards against a future caller
    // passing sourceIncludes that re-introduces it.
    //
    // Pre-seed `dataSetOutputs` in insertion order (= globalExecutionIndex
    // order) — overwritten below once the eager-fetch returns each step's
    // actual `output`.
    const metadata: StepExecutionMetadata[] = [];
    for (const step of foundSteps) {
      if (step.input !== undefined) {
        this.inputs.set(step.id, step.input);
      }
      if (step.stepType === 'data.set') {
        this.dataSetOutputs.set(step.id, null);
      }
      metadata.push(stripIo(step));
    }
    this.state.ingestLoadedStepDocs(metadata);

    const idsToFetch = this.getIdsToEagerLoad(foundSteps);
    if (idsToFetch.length > 0) {
      const docs = await this.stepRepository.getStepExecutionsByIds(idsToFetch, ['id', 'output']);
      for (const doc of docs) {
        const output: JsonValue | null = doc.output ?? null;
        this.outputs.set(doc.id, output);
        if (this.dataSetOutputs.has(doc.id)) {
          this.dataSetOutputs.set(doc.id, output);
        }
      }
    }
  }

  /**
   * Drops in-memory IO from non-latest executions of the given step IDs.
   * Used by foreach/while exit + loop break/continue to release memory after
   * an iteration completes. Memory-only — ES docs untouched. Pinned step
   * types and the latest execution per stepId are preserved.
   */
  public evictStaleLoopOutputs(innerStepIds: Iterable<string>): void {
    for (const stepId of innerStepIds) {
      const executionIds = this.state.getStepExecutionIdsByStepId(stepId);
      if (executionIds && executionIds.length > 1) {
        const staleIds = executionIds.slice(0, -1);
        for (const execId of staleIds) {
          this.dropStaleStepIo(execId);
        }
      }
    }
  }

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
  public evictCompletedLoopsOnResume(graph: Pick<WorkflowGraph, 'getInnerStepIds'>): void {
    const completedLoopStepIds = new Set<string>();
    for (const exec of this.state.getAllStepExecutions()) {
      if (
        exec.stepType != null &&
        LOOP_STEP_TYPES.has(exec.stepType) &&
        exec.status === ExecutionStatus.COMPLETED
      ) {
        completedLoopStepIds.add(exec.stepId);
      }
    }
    for (const loopStepId of completedLoopStepIds) {
      this.evictStaleLoopOutputs(graph.getInnerStepIds(loopStepId));
    }
  }

  // ----- Rehydration --------------------------------------------------------

  /**
   * Pre-warms the in-memory state by rehydrating absent step outputs that the
   * upcoming step's context build will need.
   *
   * - `spills=false` (RAM-only): no-op — all outputs are already in `outputs`.
   * - `spills=true` + `selectiveRehydration=false` (default): collects all
   *   predecessor latest-exec IDs plus active scope-frame IDs, filters to those
   *   absent from `outputs`, then fetches from SQLite (with ES as a cold-cache
   *   fallback). Over-fetches deliberately to avoid any analysis-miss risk.
   * - `spills=true` + `selectiveRehydration=true`: when the compiled graph node
   *   carries `dataStepDependencies` (a `string[]`), only those stepIds are
   *   rehydrated — eliminating the O(n²) growth caused by the scope chain making
   *   every step a transitive successor of every prior step. When
   *   `dataStepDependencies` is `null` or `undefined` (dynamic refs or unannotated
   *   node), falls back to the full-predecessor path. Scope-frame loading is
   *   unchanged in both modes (and is a safe no-op once scope frame types are pinned).
   */
  public async prepareForRead({ node, predecessorsResolver }: PrepareForReadArgs): Promise<void> {
    if (!this.cacheTier.spills) {
      return; // RAM-only: all outputs are already in memory
    }

    // Collect latest execution IDs for predecessor nodes.
    // In selective mode, restrict to the statically-declared data-flow deps;
    // fall back to all transitive predecessors when deps are unknown.
    const idsToFetch: string[] = [];
    const dataDeps = this.selectiveRehydration ? node.dataStepDependencies : undefined;

    if (dataDeps != null) {
      // Selective path: only load what templates actually reference
      for (const stepId of dataDeps) {
        const latest = this.state.getLatestStepExecution(stepId);
        if (latest && !this.outputs.has(latest.id)) {
          idsToFetch.push(latest.id);
        }
      }
    } else {
      // Conservative path: load all transitive predecessors
      for (const pred of predecessorsResolver(node)) {
        const latest = this.state.getLatestStepExecution(pred.stepId);
        if (latest && !this.outputs.has(latest.id)) {
          idsToFetch.push(latest.id);
        }
      }
    }

    // Also include scope-frame step execution IDs needed by
    // enrichStepContextAccordingToStepScope
    const executionId = this.state.getWorkflowExecutionId();
    let currentScope = WorkflowScopeStack.fromStackFrames(
      this.state.getWorkflowExecutionScopeStack()
    );
    while (!currentScope.isEmpty()) {
      const frame = currentScope.getCurrentScope();
      currentScope = currentScope.exitScope();
      const scopeStepExecutionId = buildStepExecutionId(
        executionId,
        frame.stepId,
        currentScope.stackFrames
      );
      // Only fetch scope frames that have a recorded step execution. Scope
      // nodes like enterTimeoutZone never call startStep/finishStep and
      // therefore never write an output; fetching their IDs unconditionally
      // produces spurious ES round-trips and ERROR-level log noise.
      if (
        this.state.getStepExecution(scopeStepExecutionId) &&
        !this.outputs.has(scopeStepExecutionId)
      ) {
        idsToFetch.push(scopeStepExecutionId);
      }
    }

    if (idsToFetch.length > 0) {
      await this.rehydrateOutputs(idsToFetch);
    }
  }

  /**
   * Deletes all SQLite cache rows for this workflow run. Called from
   * workflow_execution_loop.ts at run end.
   * Failure is logged and never thrown.
   */
  public async disposeCache(): Promise<void> {
    const runId = this.state.getWorkflowExecutionId();
    try {
      await this.cacheTier.cleanup(runId);
    } catch (err) {
      this.logger?.warn(
        `SQLite cache cleanup failed for run ${runId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Fetches absent step outputs from SQLite (warm path) or Elasticsearch
   * (cold / cross-node resume fallback) for the requested step execution IDs.
   * Only IDs not currently in `outputs` are fetched — pinned types and
   * recently-written steps are skipped automatically.
   *
   * Defensively ignores IDs not returned by either tier so we don't retry
   * a doc that has been deleted / ILM'd. Logs `error` (not `warn`) when the
   * workflow is still RUNNING — that's the only scenario where a missing
   * doc indicates active data loss.
   */
  public async rehydrateOutputs(stepExecutionIds: ReadonlyArray<string>): Promise<void> {
    const idsToRehydrate = stepExecutionIds.filter((id) => !this.outputs.has(id));
    if (idsToRehydrate.length === 0) {
      return;
    }

    const startMs = performance.now();
    const expectedRunId = this.state.getWorkflowExecutionId();

    // --- SQLite cache tier: try local disk before ES mget ---
    const cacheHits = await this.cacheTier.get(idsToRehydrate, expectedRunId);
    const cacheElapsedMs = Math.round(performance.now() - startMs);
    const stillMissingIds: string[] = [];
    let cacheRestoredCount = 0;
    for (const id of idsToRehydrate) {
      if (cacheHits.has(id)) {
        this.outputs.set(id, cacheHits.get(id) ?? null);
        this.transientIds.add(id);
        cacheRestoredCount++;
        const sz = safeOutputSize(cacheHits.get(id) ?? null);
        if (sz !== null) this.setOutputSize(id, sz);
      } else {
        stillMissingIds.push(id);
      }
    }
    if (cacheRestoredCount > 0) {
      this.logger?.debug(
        `Rehydrated ${cacheRestoredCount}/${idsToRehydrate.length} step output(s) from SQLite cache in ${cacheElapsedMs}ms`
      );
    }
    if (stillMissingIds.length === 0) {
      return;
    }
    // ---------------------------------------------------------

    const fetched = await this.stepRepository.getStepExecutionsByIds(stillMissingIds, [
      'id',
      'output',
      'workflowRunId',
    ]);
    // Defensive cross-execution filter: mget targets documents by `_id` only,
    // and step execution IDs are constructed from the workflow execution ID,
    // so a collision is improbable but not impossible. Drop any doc whose
    // workflowRunId disagrees with the current execution rather than
    // restoring foreign output into memory.
    const docs = fetched.filter((doc) => {
      if (doc.workflowRunId && doc.workflowRunId !== expectedRunId) {
        this.logger?.error(
          `Cross-execution doc skipped during rehydration: id=${doc.id} expected runId=${expectedRunId} got=${doc.workflowRunId}`
        );
        return false;
      }
      return true;
    });

    let restoredCount = 0;
    for (const doc of docs) {
      // The repository normalises absent `output` to `null` at the boundary.
      // FAILED steps are not eviction candidates so null here means a
      // legitimately null COMPLETED output.
      this.outputs.set(doc.id, doc.output ?? null);
      this.transientIds.add(doc.id);
      restoredCount++;
      const sz = safeOutputSize(doc.output);
      if (sz !== null) this.setOutputSize(doc.id, sz);
    }

    const elapsedMs = Math.round(performance.now() - startMs);
    this.logger?.debug(
      `Rehydrated ${restoredCount}/${stillMissingIds.length} step output(s) from ES in ${elapsedMs}ms`
    );

    // Defensive: IDs still absent after both tiers may have been ILM'd.
    const stillAbsentAfterFetch = stillMissingIds.filter((id) => !this.outputs.has(id));
    if (stillAbsentAfterFetch.length > 0) {
      const message = `${
        stillAbsentAfterFetch.length
      } step output(s) not found in ES during rehydration: ${stillAbsentAfterFetch.join(', ')}`;
      if (this.state.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
        this.logger?.error(message);
      } else {
        this.logger?.warn(message);
      }
    }
  }

  /**
   * Evicts rehydrated outputs that were snapshotted at the start of the
   * current flush cycle. Called by {@link flushStepChanges} after the
   * bulk-upsert succeeds. Pinned step types are preserved.
   *
   * Using a snapshot (taken before the async write) means only transients
   * that were already resident at flush-start are dropped — any output
   * rehydrated by a concurrent `prepareForRead` during the await is not
   * in the snapshot and stays in memory until the following flush.
   */
  private evictFlushedTransients(snapshot: ReadonlySet<string>): void {
    let droppedCount = 0;
    for (const id of snapshot) {
      if (!this.transientIds.has(id)) {
        continue; // already evicted by evictFlushedOutputs (step re-ran after rehydration)
      }
      const stepType = this.state.getStepExecution(id)?.stepType;
      if (stepType !== undefined && this.pinnedStepTypes.has(stepType)) {
        continue;
      }
      this.outputs.delete(id);
      this.transientIds.delete(id);
      this.clearOutputSize(id);
      droppedCount++;
    }
    if (droppedCount > 0) {
      this.logger?.debug(`Re-evicted ${droppedCount} transient step output(s) at flush`);
    }
  }

  // ----- Internals ----------------------------------------------------------

  /**
   * Drains state's pending lifecycle partials, joins them with this service's
   * IO partials by step id, and runs the bulk-upsert.
   *
   * Returns two sets:
   * - `flushedIds`: every step ID written in this batch (lifecycle or IO).
   *   Used for input eviction and telemetry.
   * - `outputFlushedIds`: IDs whose `output` field was included in this
   *   specific batch. Used for output eviction — a step ID may be in
   *   `flushedIds` because only its lifecycle (e.g. RUNNING) was written
   *   here, while its output arrives in a later batch. Evicting based on
   *   `flushedIds` alone would remove the output from the heap before the
   *   ES document actually contains it (premature-eviction race).
   */
  private async persistMergedStepChanges(): Promise<{
    flushedIds: ReadonlyArray<string>;
    outputFlushedIds: ReadonlySet<string>;
  }> {
    const lifecyclePartials = this.state.drainPendingStepChanges();
    const ioPartials = this.pendingIoChanges;
    this.pendingIoChanges = new Map();

    if (lifecyclePartials.size === 0 && ioPartials.size === 0) {
      return { flushedIds: [], outputFlushedIds: new Set() };
    }

    // Track which IDs had their output field written in this batch.
    // These are the only IDs whose heap copy can safely be evicted after the
    // upsert succeeds — for all others, the output has not yet reached ES.
    const outputFlushedIds = new Set<string>();
    for (const [id, ioPart] of ioPartials) {
      if ('output' in ioPart) {
        outputFlushedIds.add(id);
      }
    }

    const merged = new Map<string, Partial<EsWorkflowStepExecution>>();
    for (const [id, partial] of lifecyclePartials) {
      merged.set(id, { ...partial });
    }
    for (const [id, ioPart] of ioPartials) {
      const existing = merged.get(id) ?? { id };
      merged.set(id, { ...existing, ...ioPart });
    }

    const flushedIds = Array.from(merged.keys());
    await this.stepRepository.bulkUpsert(Array.from(merged.values()));
    return { flushedIds, outputFlushedIds };
  }

  /**
   * Returns the IDs of step executions whose outputs should be eagerly loaded
   * from Elasticsearch on resume.
   *
   * - `spills=false` (RAM-only): return ALL step execution IDs so that every
   *   output is in memory after resume and `prepareForRead` is a no-op.
   * - `spills=true` (SQLite spill): return only pinned step types; everything
   *   else stays absent and is rehydrated on demand (SQLite → ES fallback).
   */
  private getIdsToEagerLoad(steps: ReadonlyArray<EsWorkflowStepExecution>): string[] {
    if (!this.cacheTier.spills) {
      return steps.map((s) => s.id);
    }
    return steps
      .filter((s) => s.stepType != null && this.pinnedStepTypes.has(s.stepType))
      .map((s) => s.id);
  }

  /**
   * Drops from RAM all COMPLETED non-pinned step outputs whose `output` field
   * was confirmed written to ES in the current flush batch. Only called when
   * `cacheTier.spills=true`.
   *
   * The caller passes `outputFlushedIds` — the subset of IDs from
   * `persistMergedStepChanges` that had their `output` field included in the
   * bulk-upsert — NOT the full `flushedIds` set. A step may appear in
   * `flushedIds` because only its lifecycle (e.g. RUNNING state) was written;
   * evicting its output at that point would remove it from the heap before
   * the ES document contains it (premature-eviction race).
   *
   * Failed steps (`output: null`) and pinned types are never evicted.
   */
  private evictFlushedOutputs(outputFlushedIds: ReadonlySet<string>): void {
    let evictedCount = 0;
    for (const id of outputFlushedIds) {
      const step = this.state.getStepExecution(id);
      const isEvictable =
        step !== undefined &&
        step.status === ExecutionStatus.COMPLETED &&
        this.outputs.has(id) &&
        !(step.stepType && this.pinnedStepTypes.has(step.stepType));
      if (isEvictable) {
        this.outputs.delete(id);
        this.clearOutputSize(id);
        evictedCount++;
      }
    }
    if (evictedCount > 0) {
      this.logger?.debug(`Evicted ${evictedCount} flushed step output(s) from memory`);
    }
  }

  /**
   * Drops in-memory IO without marking the step as rehydratable from ES.
   * Used by `evictStaleLoopOutputs` for non-latest loop executions whose
   * output and input no caller will ever read again — there's no value in
   * paying an ES round-trip to bring them back. Pinned-type guards live
   * here so the loop-cleanup caller doesn't have to know the rules.
   */
  private dropStaleStepIo(stepExecutionId: string): void {
    const step = this.state.getStepExecution(stepExecutionId);
    if (!step) return;
    if (step.stepType && this.pinnedStepTypes.has(step.stepType)) return;
    this.outputs.delete(stepExecutionId);
    this.inputs.delete(stepExecutionId);
    this.clearOutputSize(stepExecutionId);
  }

  private evictCompletedStepInputs(candidateIds: ReadonlyArray<string>): void {
    let evictedCount = 0;
    for (const id of candidateIds) {
      const step = this.state.getStepExecution(id);
      if (step) {
        const isTerminal =
          step.status === ExecutionStatus.COMPLETED || step.status === ExecutionStatus.FAILED;
        if (isTerminal && this.inputs.has(id)) {
          this.inputs.delete(id);
          evictedCount++;
        }
      }
    }
    if (evictedCount > 0) {
      this.logger?.debug(`Evicted input from ${evictedCount} completed step(s)`);
    }
  }
}

/**
 * Returns a copy of the step doc with `input` and `output` stripped. Used at
 * load time before handing the doc to state — IO ownership lives in the
 * service's input/output maps, never in state, so `StepExecutionMetadata`
 * (which is `Omit<EsWorkflowStepExecution, 'input' | 'output'>`) must not
 * carry those fields.
 */
function stripIo(step: EsWorkflowStepExecution): StepExecutionMetadata {
  const { input: _input, output: _output, ...metadata } = step;
  return metadata;
}
