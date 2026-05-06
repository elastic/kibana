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
import type { EsWorkflowStepExecution, SerializedError, StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { extractReferencedStepIds } from './extract_referenced_step_ids';
import { EVICTION_EXEMPT_STEP_TYPES } from './step_io_pinned_types';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import { formatBytes, safeOutputSize } from '../step/errors';
import { buildStepExecutionId } from '../utils';

/**
 * Narrow view of `WorkflowExecutionState` that the service depends on.
 * Keeps the service free of the full state class and makes test doubles trivial.
 */
export interface StepIoStateAccessor {
  getStepExecution(stepExecutionId: string): EsWorkflowStepExecution | undefined;
  getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined;
  upsertStep(step: Partial<EsWorkflowStepExecution>): void;
  /** Memory-only mutators — do NOT add entries to stepDocumentsChanges. */
  clearStepOutputInMemory(stepExecutionId: string): void;
  clearStepInputInMemory(stepExecutionId: string): void;
  restoreStepOutputInMemory(stepExecutionId: string, output: JsonValue | null): void;
  /** Workflow-level status used to grade rehydration miss severity. */
  getWorkflowExecutionStatus(): ExecutionStatus;
  /** Workflow execution id; used to materialise scope-stack step execution ids. */
  getWorkflowExecutionId(): string;
  /** Current workflow scope stack; used by `prepareForRead` to materialise scope-stack step execution ids. */
  getWorkflowExecutionScopeStack(): StackFrame[];
}

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

export interface CompleteStepArgs {
  id: string;
  output: unknown;
  finishedAt: string;
  executionTimeMs?: number;
}

export interface FailStepArgs {
  id: string;
  stepId: string;
  stepType?: string;
  error: SerializedError;
  finishedAt: string;
  executionTimeMs?: number;
  scopeStack: StackFrame[];
}

export interface PrepareForReadArgs {
  node: GraphNodeUnion;
  predecessorsResolver: PredecessorsResolver;
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
 *
 * The service does not own the canonical step document — it mutates
 * `step.input`/`step.output` on the state-owned doc through three
 * named, memory-only mutators. This keeps `WorkflowExecutionState`
 * focused on document storage + ES persistence and makes "this mutation
 * must not propagate to ES" a structural property rather than a comment.
 */
export class StepIoService {
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

  constructor(init: StepIoServiceInit) {
    this.stepRepository = init.stepRepository;
    this.state = init.state;
    this.pinnedStepTypes = init.pinnedStepTypes ?? EVICTION_EXEMPT_STEP_TYPES;
    this.evictionMinBytes = init.evictionMinBytes ?? Infinity;
    this.logger = init.logger;
  }

  // ----- IO reads -----------------------------------------------------------

  public getStepOutput(stepExecutionId: string): JsonValue | null | undefined {
    return this.state.getStepExecution(stepExecutionId)?.output;
  }

  public getStepInput(stepExecutionId: string): JsonValue | undefined {
    return this.state.getStepExecution(stepExecutionId)?.input;
  }

  // ----- IO writes ----------------------------------------------------------

  public setStepInput(stepExecutionId: string, input: JsonValue): void {
    this.state.upsertStep({ id: stepExecutionId, input });
  }

  /**
   * Atomic transition: status -> COMPLETED, output, finishedAt, executionTimeMs.
   * Single `upsertStep` call so no flush observer can interleave between status
   * and output writes.
   */
  public completeStep({ id, output, finishedAt, executionTimeMs }: CompleteStepArgs): void {
    this.state.upsertStep({
      id,
      status: ExecutionStatus.COMPLETED,
      finishedAt,
      output: output as JsonValue,
      ...(executionTimeMs !== undefined ? { executionTimeMs } : {}),
    });
  }

  /**
   * Atomic transition: status -> FAILED, output: null, error, finishedAt, executionTimeMs.
   * `output: null` is semantically distinct from `undefined` (evicted) and is
   * preserved by `isEvictionCandidate`.
   */
  public failStep({
    id,
    stepId,
    stepType,
    error,
    finishedAt,
    executionTimeMs,
    scopeStack,
  }: FailStepArgs): void {
    this.state.upsertStep({
      id,
      stepId,
      stepType,
      status: ExecutionStatus.FAILED,
      scopeStack,
      finishedAt,
      output: null,
      error,
      ...(executionTimeMs !== undefined ? { executionTimeMs } : {}),
    });
  }

  // ----- Size tracking & telemetry ------------------------------------------

  /**
   * Records the output byte size for a step execution. Called by Layer 2
   * enforcement after `safeOutputSize()` has already serialised the output —
   * zero additional serialisation cost. Negative values (the `safeOutputSize`
   * sentinel for non-serialisable outputs) are ignored so callers cannot poison
   * `getOutputSizeStats()`.
   */
  public recordOutputSize(stepExecutionId: string, bytes: number): void {
    if (bytes < 0) return;
    this.outputSizes.set(stepExecutionId, bytes);
  }

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

  // ----- Rehydration --------------------------------------------------------

  /**
   * Pre-warms the in-memory state by rehydrating any evicted step outputs that
   * the upcoming step's context build will need. Targeted via static template
   * analysis (`extractReferencedStepIds`); falls back to all predecessors when
   * the analysis is ambiguous (dynamic bracket access, etc.). Also rehydrates
   * scope-stack entries used by `enrichStepContextAccordingToStepScope`.
   *
   * No-op (zero ES calls) when nothing is evicted.
   */
  public async prepareForRead({ node, predecessorsResolver }: PrepareForReadArgs): Promise<void> {
    if (!this.hasEvictedOutputs()) {
      return;
    }

    const neededIds = new Set<string>();
    const referencedStepIds = extractReferencedStepIds(node);

    if (referencedStepIds === null) {
      // Static analysis ambiguous — fall back to all predecessors.
      for (const pred of predecessorsResolver(node)) {
        const latestExec = this.state.getLatestStepExecution(pred.stepId);
        if (latestExec) {
          neededIds.add(latestExec.id);
        }
      }
    } else {
      for (const stepId of referencedStepIds) {
        const latestExec = this.state.getLatestStepExecution(stepId);
        if (latestExec) {
          neededIds.add(latestExec.id);
        }
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

    // data.set / waitForInput outputs are pinned (never evicted), so they
    // never appear in evictedOutputIdsAndBytes — rehydrateOutputs filters
    // out non-evicted IDs cheaply.

    await this.rehydrateOutputs(Array.from(neededIds));
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
    const docs = await this.stepRepository.getStepExecutionsByIds(idsToRehydrate, ['id', 'output']);

    let restoredCount = 0;
    for (const doc of docs) {
      const previousBytes = this.evictedOutputIdsAndBytes.get(doc.id) ?? 0;
      this.evictedOutputIdsAndBytes.delete(doc.id);
      // doc.output is JsonValue | undefined off the typed shape; ES treats
      // `null` and `undefined` interchangeably at the source level, but the
      // engine relies on the `null` (FAILED) vs `undefined` distinction.
      // FAILED steps are not eviction candidates, so any rehydrated value
      // here was a COMPLETED output — coerce a missing value back to null
      // would lose the original signal, so we restore as-is.
      this.state.restoreStepOutputInMemory(doc.id, doc.output ?? null);
      restoredCount++;

      // Restore size tracking so:
      //  1. getOutputSizeStats() remains accurate after rehydration
      //  2. The step is eligible for re-eviction next cycle
      // For live-execution evictions the original size is preserved; for
      // resume-path deferred outputs it's unknown (stored as 0), so we
      // measure via safeOutputSize. Non-measurable outputs (-1 sentinel)
      // are deliberately not tracked rather than recorded as 0.
      if (previousBytes > 0) {
        this.outputSizes.set(doc.id, previousBytes);
      } else {
        const sz = safeOutputSize(doc.output);
        if (sz >= 0) {
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

  // ----- Lifecycle hooks ----------------------------------------------------

  /**
   * Called by `WorkflowExecutionState.load()` after step docs are fetched
   * (without `output`). Marks non-pinned steps as deferred so the existing
   * `prepareForRead` → `rehydrateOutputs` path will fetch them on demand.
   * Returns the IDs of pinned steps whose outputs the state should mget
   * eagerly (data.set is read globally by getVariables; waitForInput
   * answers must always be present).
   */
  public onLoad(steps: ReadonlyArray<EsWorkflowStepExecution>): { pinnedIdsToFetch: string[] } {
    const pinnedIds: string[] = [];
    for (const step of steps) {
      if (step.stepType && this.pinnedStepTypes.has(step.stepType)) {
        pinnedIds.push(step.id);
      } else {
        // Size unknown on resume — recorded as 0, measured on first rehydrate.
        this.evictedOutputIdsAndBytes.set(step.id, 0);
      }
    }
    return { pinnedIdsToFetch: pinnedIds };
  }

  /**
   * Called by `WorkflowExecutionState.flushStepChanges()` after `bulkUpsert`
   * succeeds. Drains the previous cycle's deferred output evictions, queues
   * this cycle's flushed IDs for next-cycle eviction, and runs immediate
   * input eviction on terminal steps. Pass `[]` when the flush had no doc
   * changes — the queue must still be drained on its scheduled cycle.
   */
  public onStepsFlushed(flushedIds: ReadonlyArray<string>): void {
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
  public clearStepIo(stepExecutionId: string): void {
    const step = this.state.getStepExecution(stepExecutionId);
    if (!step) return;
    if (step.stepType && this.pinnedStepTypes.has(step.stepType)) return;
    this.state.clearStepOutputInMemory(stepExecutionId);
    this.state.clearStepInputInMemory(stepExecutionId);
    this.outputSizes.delete(stepExecutionId);
  }

  // ----- Internals ----------------------------------------------------------

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
}
