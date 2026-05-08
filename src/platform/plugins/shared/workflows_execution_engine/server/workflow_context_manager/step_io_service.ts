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
import { extractReferencedStepIds } from './extract_referenced_step_ids';
import { EVICTION_EXEMPT_STEP_TYPES, LOOP_STEP_TYPES } from './step_io_pinned_types';
import type { StepIoStateAccessor } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import { formatBytes, safeOutputSize } from '../step/errors';
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
   * Writes a step's output to in-memory state and queues it for the next
   * flush. Optionally records the byte size for eviction/telemetry — pass
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
 * Owns the in-memory IO lifecycle of a workflow run:
 *
 * - **Reads/writes** of step `input`/`output` (delegated through narrow
 *   memory-only mutators on `WorkflowExecutionState`).
 * - **Output size accounting** for telemetry (`recordOutputSize`,
 *   `getOutputSizeStats`).
 * - **Deferred output eviction** of large completed-step outputs from
 *   in-memory state after they have been flushed to Elasticsearch.
 * - **Immediate input eviction** of terminal-step inputs post-flush.
 * - **On-demand rehydration** of evicted outputs from ES via
 *   `prepareForRead`, used right before the context manager builds a
 *   step context that may need a previously-evicted output.
 * - **Resume-time deferred-output orchestration** via `load()`.
 * - **Stale-loop iteration cleanup** via `evictStaleLoopOutputs`.
 *
 * The service is the public entry point for the IO lifecycle: callers
 * (runtime manager, persistence loop, loop step impls) drive flush / load /
 * stale-loop cleanup through it. State exposes only the in-memory document
 * store and ES persistence primitives. The dependency graph is one-way:
 * service → state → repositories.
 */
export class StepIoService implements StepIoWriter, StepIoLifecycle {
  private readonly stepRepository: StepExecutionRepository;
  private readonly state: StepIoStateAccessor;
  private readonly pinnedStepTypes: ReadonlySet<string>;
  private readonly evictionMinBytes: number;
  private readonly logger?: Logger;

  /** Step execution IDs whose `output` field has been evicted from memory. Value is the original size in bytes (0 if unknown — e.g. resume-time deferred). */
  private readonly evictedOutputIdsAndBytes = new Map<string, number>();
  /** Recorded output sizes (Layer 2 enforcement). Used to gate eviction eligibility. */
  private readonly outputSizes = new Map<string, number>();
  /** IDs queued for eviction on the NEXT flush cycle (one-cycle deferral). */
  private pendingOutputEvictionIds: ReadonlyArray<string> = [];
  /**
   * IDs that the most recent `prepareForRead` had to rehydrate from ES. Used
   * by `releaseTransientlyRehydratedOutputs` to drop those outputs back to
   * the evicted state once the consuming step has finished, so resume tasks
   * don't progressively grow in-memory state by accumulating predecessor
   * outputs they only briefly needed.
   */
  private transientlyRehydratedIds: string[] = [];

  /**
   * Memoised `data.set` aggregation. `getVariables()` is called from every
   * `getContext()` (5–10× per step), and the underlying walk filters and
   * sorts every step execution. Cache invalidation: any write that touches a
   * `data.set` step (creation, completion, failure) clears this — see
   * `invalidateDataSetCacheIfNeeded`.
   */
  private dataSetVariablesCache: Record<string, unknown> | undefined;

  constructor(init: StepIoServiceInit) {
    this.stepRepository = init.stepRepository;
    this.state = init.state;
    this.pinnedStepTypes = init.pinnedStepTypes ?? EVICTION_EXEMPT_STEP_TYPES;
    this.evictionMinBytes = init.evictionMinBytes ?? Infinity;
    this.logger = init.logger;
  }

  // ----- IO reads -----------------------------------------------------------
  // The service is the single chokepoint for IO reads as well as writes:
  // every consumer of step `input`/`output`/`error` goes through here, so any
  // future read-side concern (lazy rehydration, redaction, schema evolution)
  // has exactly one place to land.

  public getStepOutput(stepExecutionId: string): JsonValue | null | undefined {
    return this.state.getStepExecution(stepExecutionId)?.output;
  }

  public getStepInput(stepExecutionId: string): JsonValue | undefined {
    return this.state.getStepExecution(stepExecutionId)?.input;
  }

  public getStepError(stepExecutionId: string): SerializedError | undefined {
    return this.state.getStepExecution(stepExecutionId)?.error;
  }

  /**
   * Returns the input/output/error of the latest execution of `stepId`, or
   * `undefined` when the step has not run. Used by the context manager and
   * retry path to read step results without poking at execution state.
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
    return { input: latest.input, output: latest.output, error: latest.error };
  }

  /**
   * Aggregates outputs from all completed `data.set` step executions in
   * execution order. `data.set` is pinned (never evicted) so this read does
   * not need rehydration. Memoised — `getContext()` (and therefore this) is
   * called 5–10× per step, but the result only changes when a `data.set`
   * step writes; the cache is invalidated by `invalidateDataSetCacheIfNeeded`
   * on every write path.
   */
  public getDataSetVariables(): Record<string, unknown> {
    if (this.dataSetVariablesCache !== undefined) {
      return this.dataSetVariablesCache;
    }
    const result: Record<string, unknown> = {};
    const sorted = this.state
      .getAllStepExecutions()
      .filter(
        (exec) =>
          exec.stepType === 'data.set' &&
          exec.output != null &&
          typeof exec.output === 'object' &&
          !Array.isArray(exec.output)
      )
      .sort((a, b) => a.globalExecutionIndex - b.globalExecutionIndex);
    for (const exec of sorted) {
      Object.assign(result, exec.output);
    }
    this.dataSetVariablesCache = result;
    return result;
  }

  /**
   * Drops the memoised `data.set` aggregation when a write may have changed
   * its contents. Cheap — invoked on every step write but only does work
   * when the write touches a `data.set` step.
   */
  private invalidateDataSetCacheIfNeeded(stepExecutionId: string, stepType?: string): void {
    if (stepType === 'data.set') {
      this.dataSetVariablesCache = undefined;
      return;
    }
    if (stepType === undefined) {
      // Caller didn't tell us — peek at state to find out.
      const existing = this.state.getStepExecution(stepExecutionId);
      if (existing?.stepType === 'data.set') {
        this.dataSetVariablesCache = undefined;
      }
    }
  }

  // ----- IO writes ----------------------------------------------------------

  public setStepInput(stepExecutionId: string, input: JsonValue): void {
    this.state.upsertStep({ id: stepExecutionId, input });
  }

  /**
   * Writes a step's output through the change tracker so it lands in ES on
   * the next flush. Lifecycle fields (status, finishedAt, error, etc.) are
   * the caller's responsibility: the runtime emits a separate
   * `state.upsertStep` for those.
   *
   * Atomicity with the lifecycle write is preserved because both writes
   * happen synchronously on the same tick — the persistence loop runs in a
   * separate microtask chain and cannot interleave between them. State's
   * `updateStep` merges the partials so the flush queue ends up with one
   * combined entry per step id, identical to the previous single-call
   * shape.
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
    this.invalidateDataSetCacheIfNeeded(stepExecutionId);
    if (sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes >= 0) {
      this.outputSizes.set(stepExecutionId, sizeBytes);
    }
    this.state.upsertStep({ id: stepExecutionId, output });
  }

  // ----- Size tracking & telemetry ------------------------------------------

  /**
   * Aggregate output size statistics across active and evicted steps. Uses
   * pre-recorded sizes only — safe to call after eviction or at terminal state.
   */
  public getOutputSizeStats(): OutputSizeStats {
    let totalBytes = 0;
    let stepCount = 0;
    for (const bytes of this.outputSizes.values()) {
      totalBytes += bytes;
      stepCount++;
    }
    for (const bytes of this.evictedOutputIdsAndBytes.values()) {
      totalBytes += bytes;
      stepCount++;
    }
    return { totalBytes, stepCount };
  }

  public hasEvictedOutputs(): boolean {
    return this.evictedOutputIdsAndBytes.size > 0;
  }

  // ----- Lifecycle (public entry points) -----------------------------------

  /**
   * Flushes pending step-doc and workflow-doc changes to Elasticsearch and
   * runs IO bookkeeping (deferred output eviction + immediate input eviction)
   * on the freshly-flushed step IDs. Replaces the previous `state.flush()`
   * entry point — callers should now go through the service.
   */
  public async flush(): Promise<void> {
    await Promise.all([this.state.flushWorkflowDoc(), this.flushStepChanges()]);
  }

  /**
   * Step-doc-only flush. Drives state's bulk upsert, then runs the deferred
   * output-eviction cycle and immediate input eviction. Even when there are
   * no doc changes this still drains the previous cycle's eviction queue —
   * the deferral is one cycle, not one bulk-upsert.
   */
  public async flushStepChanges(): Promise<void> {
    const flushedIds = await this.state.flushStepDocs();
    this.runDeferredEvictionCycle(flushedIds);
  }

  /**
   * Resume-time entry point. Asks state to fetch step metadata without the
   * `output` field, marks non-pinned outputs as deferred, then asks state
   * to eagerly fetch outputs for pinned step types (data.set, waitForInput).
   * Drops the `data.set` cache because the eager output fetch repopulates
   * pinned outputs that the cache may have computed against (none, on a
   * fresh load) — invalidate to be safe.
   */
  public async load(): Promise<void> {
    this.dataSetVariablesCache = undefined;
    const foundSteps = await this.state.loadStepDocsWithoutOutput();
    const pinnedIdsToFetch = this.markDeferredAfterLoad(foundSteps);
    await this.state.loadStepOutputs(pinnedIdsToFetch);
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
   * Pre-warms the in-memory state by rehydrating any evicted step outputs that
   * the upcoming step's context build will need. Targeted via static template
   * analysis (`extractReferencedStepIds`); falls back to all predecessors when
   * the analysis is ambiguous (dynamic bracket access, etc.). Also rehydrates
   * scope-stack entries used by `enrichStepContextAccordingToStepScope`.
   *
   * No-op (zero ES calls) when nothing is evicted.
   *
   * Reset of `transientlyRehydratedIds` happens here, not in
   * `releaseTransientlyRehydratedOutputs`, so an error that bypasses the
   * release in run_node's `finally` cannot leak previous-step IDs into the
   * next step's transient set.
   */
  public async prepareForRead({ node, predecessorsResolver }: PrepareForReadArgs): Promise<void> {
    this.transientlyRehydratedIds = [];

    if (!this.hasEvictedOutputs()) {
      return;
    }

    const neededIds = this.computeRehydrationTargets(node, predecessorsResolver);

    // data.set / waitForInput outputs are pinned (never evicted), so they
    // never appear in evictedOutputIdsAndBytes — rehydrateOutputs filters
    // out non-evicted IDs cheaply.

    await this.rehydrateOutputs(Array.from(neededIds));
  }

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
  private computeRehydrationTargets(
    node: GraphNodeUnion,
    predecessorsResolver: PredecessorsResolver
  ): Set<string> {
    const neededIds = new Set<string>();
    const referencedStepIds = extractReferencedStepIds(node);

    const fallbackToPredecessors = (): void => {
      for (const pred of predecessorsResolver(node)) {
        const latestExec = this.state.getLatestStepExecution(pred.stepId);
        if (latestExec) {
          neededIds.add(latestExec.id);
        }
      }
    };

    if (referencedStepIds === null) {
      // Static analysis ambiguous (dynamic bracket access).
      fallbackToPredecessors();
    } else {
      for (const stepId of referencedStepIds) {
        const latestExec = this.state.getLatestStepExecution(stepId);
        if (latestExec) {
          neededIds.add(latestExec.id);
        }
      }
      // If the analysis found nothing but a predecessor is actually evicted,
      // the analysis missed a reference. Fall back conservatively rather
      // than trust an empty set.
      if (referencedStepIds.size === 0 && this.hasEvictedPredecessor(node, predecessorsResolver)) {
        fallbackToPredecessors();
      }
    }

    // Scope-stack entries — needed by enrichStepContextAccordingToStepScope.
    const executionId = this.state.getWorkflowExecutionId();
    let currentScope = WorkflowScopeStack.fromStackFrames(
      this.state.getWorkflowExecutionScopeStack()
    );
    while (!currentScope.isEmpty()) {
      const frame = currentScope.getCurrentScope();
      currentScope = currentScope.exitScope();
      neededIds.add(buildStepExecutionId(executionId, frame.stepId, currentScope.stackFrames));
    }

    return neededIds;
  }

  private hasEvictedPredecessor(
    node: GraphNodeUnion,
    predecessorsResolver: PredecessorsResolver
  ): boolean {
    for (const pred of predecessorsResolver(node)) {
      const latestExec = this.state.getLatestStepExecution(pred.stepId);
      if (latestExec && this.evictedOutputIdsAndBytes.has(latestExec.id)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Re-evicts in memory the outputs that the most recent `prepareForRead`
   * brought back from ES. Called after the consuming step finishes, so that
   * predecessor outputs do not stay resident for the rest of the run.
   *
   * Memory-only: the doc is already on disk (it was evicted before we
   * rehydrated), so we just mark it evicted again and clear it from state.
   * Idempotent — calling with no transient rehydrations is a no-op.
   */
  public releaseTransientlyRehydratedOutputs(): void {
    if (this.transientlyRehydratedIds.length === 0) {
      return;
    }
    const idsToRelease = this.transientlyRehydratedIds;
    this.transientlyRehydratedIds = [];

    let releasedCount = 0;
    for (const id of idsToRelease) {
      // Re-eviction is identical to eviction except the threshold gate doesn't
      // apply (the output is known to have been evictable since it came back
      // from ES). Reuse the same predicate ignoring the size check.
      if (this.isReleaseCandidate(id)) {
        const sizeBytes = this.outputSizes.get(id) ?? 0;
        this.state.clearStepOutputInMemory(id);
        this.evictedOutputIdsAndBytes.set(id, sizeBytes);
        this.outputSizes.delete(id);
        releasedCount++;
      }
    }

    if (releasedCount > 0) {
      this.logger?.debug(
        `Released ${releasedCount} transiently rehydrated step output(s); total evicted: ${this.evictedOutputIdsAndBytes.size}`
      );
    }
  }

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
  public async rehydrateOutputs(stepExecutionIds: ReadonlyArray<string>): Promise<void> {
    const idsToRehydrate = stepExecutionIds.filter((id) => this.evictedOutputIdsAndBytes.has(id));
    if (idsToRehydrate.length === 0) {
      return;
    }

    const totalBytes = idsToRehydrate.reduce(
      (sum, id) => sum + (this.evictedOutputIdsAndBytes.get(id) ?? 0),
      0
    );

    const startMs = performance.now();
    const expectedRunId = this.state.getWorkflowExecutionId();
    const fetched = await this.stepRepository.getStepExecutionsByIds(idsToRehydrate, [
      'id',
      'output',
      'workflowRunId',
    ]);
    // Defensive cross-execution filter: mget targets documents by `_id` only,
    // and step execution IDs are constructed from the workflow execution ID,
    // so a collision is improbable but not impossible (e.g. someone running
    // a custom resume path with mis-typed IDs). Drop any doc whose
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
      const previousBytes = this.evictedOutputIdsAndBytes.get(doc.id) ?? 0;
      this.evictedOutputIdsAndBytes.delete(doc.id);
      // The repository normalises absent `output` to `null` at the boundary,
      // so `doc.output` here is already `JsonValue | null`. FAILED steps are
      // not eviction candidates, so any rehydrated value was a COMPLETED
      // output, and `null` only occurs when ES legitimately stored null.
      this.state.restoreStepOutputInMemory(doc.id, doc.output ?? null);
      // Track for transient release: predecessors brought back into memory
      // for one step's read should not stay there forever.
      this.transientlyRehydratedIds.push(doc.id);
      restoredCount++;

      // Restore size tracking so:
      //  1. getOutputSizeStats() remains accurate after rehydration
      //  2. The step is eligible for re-eviction next cycle
      // For live-execution evictions the original size is preserved; for
      // resume-path deferred outputs it's unknown (stored as 0), so we
      // measure via safeOutputSize. Non-measurable outputs (`null`) are
      // deliberately not tracked rather than recorded as 0 — these come
      // from ES so they were serialisable when written; getting null here
      // means a JSON.stringify quirk, not a poison payload.
      if (previousBytes > 0) {
        this.outputSizes.set(doc.id, previousBytes);
      } else {
        const sz = safeOutputSize(doc.output);
        if (sz !== null) {
          this.outputSizes.set(doc.id, sz);
        }
      }
    }

    // Defensive: drop IDs not returned by ES so we don't retry forever.
    const stillEvictedAfterFetch = idsToRehydrate.filter((id) =>
      this.evictedOutputIdsAndBytes.has(id)
    );
    for (const id of stillEvictedAfterFetch) {
      this.evictedOutputIdsAndBytes.delete(id);
    }

    const elapsedMs = Math.round(performance.now() - startMs);
    this.logger?.debug(
      `Rehydrated ${restoredCount}/${idsToRehydrate.length} step output(s) (${formatBytes(
        totalBytes
      )}) from ES in ${elapsedMs}ms, ${this.evictedOutputIdsAndBytes.size} still evicted`
    );

    if (stillEvictedAfterFetch.length > 0) {
      const message = `${
        stillEvictedAfterFetch.length
      } evicted step output(s) not found in ES during rehydration: ${stillEvictedAfterFetch.join(
        ', '
      )}`;
      // Missing-in-ES on a still-RUNNING workflow indicates active data loss
      // (a doc that was flushed has disappeared mid-execution). On terminal
      // workflows it's typically harmless ILM/cleanup.
      if (this.state.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
        this.logger?.error(message);
      } else {
        this.logger?.warn(message);
      }
    }
  }

  // ----- Internals ----------------------------------------------------------

  /**
   * Marks non-pinned step outputs as deferred (rehydrated on demand) and
   * returns the IDs of pinned step types whose outputs the state should
   * eagerly mget.
   */
  private markDeferredAfterLoad(steps: ReadonlyArray<EsWorkflowStepExecution>): string[] {
    const pinnedIds: string[] = [];
    for (const step of steps) {
      if (step.stepType && this.pinnedStepTypes.has(step.stepType)) {
        pinnedIds.push(step.id);
      } else {
        // Size unknown on resume — recorded as 0, measured on first rehydrate.
        this.evictedOutputIdsAndBytes.set(step.id, 0);
      }
    }
    return pinnedIds;
  }

  /**
   * Drains the previous cycle's deferred output evictions, queues this
   * cycle's flushed IDs for next-cycle eviction, and runs immediate input
   * eviction on terminal steps. Called with `[]` when the flush had no doc
   * changes — the queue must still be drained on its scheduled cycle.
   */
  private runDeferredEvictionCycle(flushedIds: ReadonlyArray<string>): void {
    if (this.pendingOutputEvictionIds.length > 0) {
      const toEvict = this.pendingOutputEvictionIds;
      this.pendingOutputEvictionIds = [];
      this.evictCompletedStepOutputs(toEvict);
    }
    if (flushedIds.length > 0) {
      this.pendingOutputEvictionIds = flushedIds;
      this.evictCompletedStepInputs(flushedIds);
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
    this.state.clearStepOutputInMemory(stepExecutionId);
    this.state.clearStepInputInMemory(stepExecutionId);
    this.outputSizes.delete(stepExecutionId);
  }

  private evictCompletedStepOutputs(candidateIds: ReadonlyArray<string>): void {
    let evictedCount = 0;
    for (const id of candidateIds) {
      const step = this.state.getStepExecution(id);
      if (step && this.isEvictionCandidate(id, step)) {
        const sizeBytes = this.outputSizes.get(id) ?? 0;
        this.state.clearStepOutputInMemory(id);
        this.evictedOutputIdsAndBytes.set(id, sizeBytes);
        this.outputSizes.delete(id);
        evictedCount++;
        this.logger?.debug(
          `Evicted output of step '${step.stepId}' (${formatBytes(sizeBytes)}) from memory`
        );
      }
    }
    if (evictedCount > 0) {
      this.logger?.debug(
        `Evicted ${evictedCount} step output(s), total evicted: ${this.evictedOutputIdsAndBytes.size}`
      );
    }
  }

  private evictCompletedStepInputs(candidateIds: ReadonlyArray<string>): void {
    let evictedCount = 0;
    for (const id of candidateIds) {
      const step = this.state.getStepExecution(id);
      if (step) {
        const isTerminal =
          step.status === ExecutionStatus.COMPLETED || step.status === ExecutionStatus.FAILED;
        if (isTerminal && step.input !== undefined) {
          this.state.clearStepInputInMemory(id);
          evictedCount++;
        }
      }
    }
    if (evictedCount > 0) {
      this.logger?.debug(`Evicted input from ${evictedCount} completed step(s)`);
    }
  }

  private isEvictionCandidate(stepExecutionId: string, step: EsWorkflowStepExecution): boolean {
    if (this.evictedOutputIdsAndBytes.has(stepExecutionId)) {
      return false;
    }
    // Only evict COMPLETED steps. Failed steps have `output: null` (semantic
    // "no output") and evicting them would shift the meaning to `undefined`
    // (semantic "evicted"), which downstream code distinguishes.
    if (step.status !== ExecutionStatus.COMPLETED) {
      return false;
    }
    // Already cleared by evictStaleLoopOutputs.
    if (step.output === undefined) {
      return false;
    }
    if (step.stepType && this.pinnedStepTypes.has(step.stepType)) {
      return false;
    }
    const recordedSize = this.outputSizes.get(stepExecutionId);
    // No recorded size = not measured by Layer 2 = assumed small.
    if (recordedSize === undefined || recordedSize < this.evictionMinBytes) {
      return false;
    }
    return true;
  }

  /**
   * Eligibility check for releasing a transiently rehydrated output back to
   * the evicted state. Same shape as {@link isEvictionCandidate} minus the
   * size threshold — the output already met the threshold the first time it
   * was evicted, so it remains eligible regardless of recorded size.
   */
  private isReleaseCandidate(stepExecutionId: string): boolean {
    const step = this.state.getStepExecution(stepExecutionId);
    if (!step) return false;
    if (this.evictedOutputIdsAndBytes.has(stepExecutionId)) return false;
    if (step.status !== ExecutionStatus.COMPLETED) return false;
    if (step.output === undefined) return false;
    if (step.stepType && this.pinnedStepTypes.has(step.stepType)) return false;
    return true;
  }
}
