/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { formatBytes } from '../step/errors';

/**
 * Step types whose outputs must never be evicted from in-memory state,
 * even for non-latest iterations in a loop.
 *
 * - data.set: getVariables reads all executions, not just the latest
 * - waitForInput: user-provided answers must be preserved for auditability
 *   and downstream access across all loop iterations
 */
const EVICTION_EXEMPT_STEP_TYPES = new Set(['data.set', 'waitForInput']);

/** Context for the step that failed during this run; used to build workflow_execution_failed event. */
export interface FailedStepContext {
  stepId: string;
  stepName: string;
  stepExecutionId: string;
}

export class WorkflowExecutionState {
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private workflowExecution: EsWorkflowExecution;
  private workflowDocumentChanges: Partial<EsWorkflowExecution> | undefined = undefined;
  private stepDocumentsChanges: Map<string, Partial<EsWorkflowStepExecution>> = new Map();

  private lastFailedStepContext: FailedStepContext | undefined = undefined;

  /**
   * Maps step IDs to their execution IDs in chronological order.
   * This index enables efficient lookup of all executions for a given step,
   * which is especially important for steps that execute multiple times
   * (e.g., in loops or retries).
   */
  private stepIdExecutionIdIndex = new Map<string, string[]>();

  /**
   * Step execution IDs whose `output` field has been evicted from in-memory state
   * after being flushed to Elasticsearch. The output data remains in ES and can be
   * re-fetched on demand via `rehydrateOutputs()`.
   */
  private readonly evictedOutputIdsAndBytes = new Map<string, number>();

  /**
   * Recorded output sizes in bytes, keyed by step execution ID.
   * Populated by Layer 2 enforcement (safeOutputSize) via `recordOutputSize()`.
   * Used to decide whether a completed step's output is large enough to evict.
   * In-memory only — not persisted to Elasticsearch.
   */
  private readonly outputSizes = new Map<string, number>();

  /**
   * Step execution IDs whose outputs were persisted in the previous flush and
   * should be evaluated for eviction on the NEXT flush. This one-cycle deferral
   * keeps outputs in memory long enough for the immediately-following step to
   * read them without an ES round-trip.
   */
  private pendingOutputEvictionIds: string[] = [];

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowStepExecutionRepository: StepExecutionRepository,
    /** Minimum output size in bytes for a step to be eligible for eviction. 0 = evict all. */
    private readonly evictionMinBytes: number = 0,
    private readonly logger?: Logger
  ) {
    this.workflowExecution = initialWorkflowExecution;
  }

  /**
   * Loads step executions from Elasticsearch for a resumed workflow.
   * To reduce memory footprint, outputs are excluded from the initial fetch and
   * marked as deferred — the existing `ensureContextReady()` → `rehydrateOutputs()`
   * path will fetch them on demand when a step actually needs them.
   *
   * `data.set` outputs are the exception: they are eagerly loaded because
   * `getVariables()` reads ALL data.set outputs globally.
   */
  public async load(): Promise<void> {
    if (!this.workflowExecution.stepExecutionIds) {
      throw new Error(
        'WorkflowExecutionState: Workflow execution must have step execution IDs to be loaded'
      );
    }

    // Fetch step metadata without the (potentially large) output field
    const foundSteps = await this.workflowStepExecutionRepository.getStepExecutionsByIds(
      this.workflowExecution.stepExecutionIds,
      undefined,
      ['output']
    );
    foundSteps.forEach((stepExecution) => this.stepExecutions.set(stepExecution.id, stepExecution));

    // Mark non-pinned steps as deferred so rehydrateOutputs() will fetch them on demand.
    // Pinned step types (data.set, waitForInput) are eagerly loaded below because their
    // outputs are needed globally (getVariables reads all data.set; waitForInput answers
    // must be preserved for downstream access across loop iterations).
    const pinnedIds: string[] = [];
    for (const step of foundSteps) {
      if (step.stepType && EVICTION_EXEMPT_STEP_TYPES.has(step.stepType)) {
        pinnedIds.push(step.id);
      } else {
        this.evictedOutputIdsAndBytes.set(step.id, 0);
      }
    }

    // Kick off the pinned-output fetch concurrently with the synchronous index build
    const pinnedOutputsPromise =
      pinnedIds.length > 0
        ? this.workflowStepExecutionRepository.getStepExecutionsByIds(pinnedIds, ['id', 'output'])
        : Promise.resolve([]);

    this.buildStepIdExecutionIdIndex();

    const pinnedOutputs = await pinnedOutputsPromise;
    for (const doc of pinnedOutputs) {
      const existing = this.stepExecutions.get(doc.id);
      if (existing) {
        existing.output = doc.output;
      }
    }

    this.logger?.debug(
      `Loaded ${foundSteps.length} step(s) with deferred outputs (${pinnedIds.length} pinned outputs eagerly loaded)`
    );
  }

  public getWorkflowExecution(): EsWorkflowExecution {
    return this.workflowExecution;
  }

  public setLastFailedStepContext(ctx: FailedStepContext): void {
    this.lastFailedStepContext = ctx;
  }

  public getLastFailedStepContext(): FailedStepContext | undefined {
    return this.lastFailedStepContext;
  }

  public updateWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): void {
    this.workflowExecution = {
      ...this.workflowExecution,
      ...workflowExecution,
    };
    this.workflowDocumentChanges = {
      ...(this.workflowDocumentChanges || {}),
      ...workflowExecution,
    };
  }

  public getAllStepExecutions(): EsWorkflowStepExecution[] {
    return Array.from(this.stepExecutions.values());
  }

  public getStepExecution(stepExecutionId: string): EsWorkflowStepExecution | undefined {
    return this.stepExecutions.get(stepExecutionId);
  }

  /**
   * Retrieves all executions for a specific workflow step in chronological order.
   * @param stepId The unique identifier of the step
   * @returns An array of step execution objects or undefined if no executions exist
   */
  public getStepExecutionsByStepId(stepId: string): EsWorkflowStepExecution[] {
    if (!this.stepIdExecutionIdIndex.has(stepId)) {
      return [];
    }

    return (
      this.stepIdExecutionIdIndex
        .get(stepId)
        ?.map((executionId) => this.stepExecutions.get(executionId) as EsWorkflowStepExecution) ??
      []
    );
  }

  /**
   * Retrieves the latest execution for a specific workflow step.
   * @param stepId The unique identifier of the step
   * @returns The latest step execution object or undefined if no executions exist
   */
  public getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined {
    const allExecutions = this.getStepExecutionsByStepId(stepId);

    if (!allExecutions?.length) {
      return undefined;
    }

    return allExecutions[allExecutions.length - 1];
  }

  public upsertStep(step: Partial<EsWorkflowStepExecution>): void {
    if (!step.id) {
      throw new Error('WorkflowExecutionState: Step execution must have an ID to be upserted');
    }

    if (!this.stepExecutions.has(step.id)) {
      this.createStep(step);
    } else {
      this.updateStep(step.id, step);
    }
  }

  /**
   * Records the output byte size for a step execution.
   * Called by Layer 2 enforcement after `safeOutputSize()` has already serialized the output,
   * so this carries zero additional serialization cost.
   */
  public recordOutputSize(stepExecutionId: string, bytes: number): void {
    this.outputSizes.set(stepExecutionId, bytes);
  }

  /**
   * Returns aggregate output size statistics from both active and evicted steps.
   * Uses pre-recorded sizes (no serialization) — safe to call after eviction.
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

  /** Returns true if any step outputs have been evicted from memory. */
  public hasEvictedOutputs(): boolean {
    return this.evictedOutputIdsAndBytes.size > 0;
  }

  /**
   * Re-fetches evicted output fields from Elasticsearch for the requested step execution IDs.
   * Only IDs that are actually evicted are fetched; if none are evicted, this is a no-op
   * with zero ES calls.
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
    // Fetch only the `output` field to minimize network transfer
    const docs = await this.workflowStepExecutionRepository.getStepExecutionsByIds(idsToRehydrate, [
      'id',
      'output',
    ]);

    let restoredCount = 0;
    for (const doc of docs) {
      const existing = this.stepExecutions.get(doc.id);
      if (existing) {
        existing.output = doc.output;
        restoredCount++;
      }
      this.evictedOutputIdsAndBytes.delete(doc.id);
    }

    // Defensive: remove IDs that were not found in ES so we don't retry forever
    const missingIds = idsToRehydrate.filter((id) => this.evictedOutputIdsAndBytes.has(id));
    for (const id of missingIds) {
      this.evictedOutputIdsAndBytes.delete(id);
    }

    const elapsedMs = Math.round(performance.now() - startMs);
    this.logger?.debug(
      `Rehydrated ${restoredCount}/${idsToRehydrate.length} step output(s) (${formatBytes(
        totalBytes
      )}) from ES in ${elapsedMs}ms, ${this.evictedOutputIdsAndBytes.size} still evicted`
    );

    if (missingIds.length > 0) {
      this.logger?.warn(
        `${
          missingIds.length
        } evicted step output(s) not found in ES during rehydration: ${missingIds.join(', ')}`
      );
    }
  }

  /**
   * Evaluates the given step execution IDs for eviction eligibility and evicts
   * large outputs from completed steps. Only the provided candidate IDs are
   * checked — callers should pass only the IDs that were just flushed to ES.
   *
   * This is a memory-only operation — the output data remains in Elasticsearch.
   * It does NOT modify `stepDocumentsChanges`, so the next flush will not
   * accidentally overwrite the persisted output in ES.
   */
  public evictCompletedStepOutputs(candidateIds: ReadonlyArray<string>): void {
    let evictedCount = 0;
    for (const id of candidateIds) {
      const step = this.stepExecutions.get(id);
      if (step && this.isEvictionCandidate(id, step)) {
        const sizeBytes = this.outputSizes.get(id) ?? 0;
        step.output = undefined;
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

  /**
   * Evicts input fields from terminal (COMPLETED/FAILED) steps to reduce memory footprint.
   * Unlike output eviction, this has no size threshold and no deferral — no successor step
   * references a predecessor's input. Input data remains in Elasticsearch.
   * This is a memory-only operation — it does NOT modify `stepDocumentsChanges`.
   */
  private evictCompletedStepInputs(candidateIds: ReadonlyArray<string>): void {
    let evictedCount = 0;
    for (const id of candidateIds) {
      const step = this.stepExecutions.get(id);
      if (step) {
        const isTerminal =
          step.status === ExecutionStatus.COMPLETED || step.status === ExecutionStatus.FAILED;
        if (isTerminal && step.input !== undefined) {
          step.input = undefined;
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

    const isTerminal =
      step.status === ExecutionStatus.COMPLETED || step.status === ExecutionStatus.FAILED;
    if (!isTerminal) {
      return false;
    }

    // Pinned step types must never be evicted (data.set: getVariables reads globally;
    // waitForInput: user-provided answers must be preserved for downstream access)
    if (step.stepType && EVICTION_EXEMPT_STEP_TYPES.has(step.stepType)) {
      return false;
    }

    const recordedSize = this.outputSizes.get(stepExecutionId);
    // Steps without a recorded size (control flow, steps where Layer 2 didn't measure)
    // are assumed small and not evicted
    if (recordedSize === undefined || recordedSize < this.evictionMinBytes) {
      return false;
    }

    return true;
  }

  public async flushStepChanges(): Promise<void> {
    if (!this.stepDocumentsChanges.size) {
      // No new changes, but still drain any pending output evictions
      // from the previous flush cycle.
      if (this.pendingOutputEvictionIds.length > 0) {
        const toEvict = this.pendingOutputEvictionIds;
        this.pendingOutputEvictionIds = [];
        this.evictCompletedStepOutputs(toEvict);
      }
      return;
    }
    const flushedIds = Array.from(this.stepDocumentsChanges.keys());
    const stepDocumentsChanges = Array.from(this.stepDocumentsChanges.values());

    this.stepDocumentsChanges.clear();
    await this.workflowStepExecutionRepository.bulkUpsert(stepDocumentsChanges);

    // Deferred output eviction: evict the PREVIOUS flush's candidates,
    // then queue THIS flush's candidates for the next cycle.
    if (this.pendingOutputEvictionIds.length > 0) {
      const toEvict = this.pendingOutputEvictionIds;
      this.pendingOutputEvictionIds = [];
      this.evictCompletedStepOutputs(toEvict);
    }
    this.pendingOutputEvictionIds = flushedIds;

    // Input eviction: immediate (no deferral needed — no successor reads predecessor input)
    this.evictCompletedStepInputs(flushedIds);
  }

  public async flush(): Promise<void> {
    await Promise.all([this.flushWorkflowChanges(), this.flushStepChanges()]);
  }

  private async flushWorkflowChanges(): Promise<void> {
    if (!this.workflowDocumentChanges) {
      return;
    }
    const changes = this.workflowDocumentChanges;
    this.workflowDocumentChanges = undefined;

    await this.workflowExecutionRepository.updateWorkflowExecution({
      ...changes,
      id: this.workflowExecution.id,
    });
  }

  private createStep(step: Partial<EsWorkflowStepExecution>) {
    const stepExecutions = this.getStepExecutionsByStepId(step.stepId as string) || [];
    if (!stepExecutions.length) {
      this.stepIdExecutionIdIndex.set(step.stepId as string, []);
    }
    this.stepIdExecutionIdIndex.get(step.stepId as string)?.push(step.id as string);
    const newStep: EsWorkflowStepExecution = {
      ...step,
      id: step.id,
      globalExecutionIndex: this.stepExecutions.size,
      stepExecutionIndex: stepExecutions.length,
      workflowRunId: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
      spaceId: this.workflowExecution.spaceId,
      isTestRun: Boolean(this.workflowExecution.isTestRun),
    } as EsWorkflowStepExecution;
    this.stepExecutions.set(step.id as string, newStep);
    this.stepDocumentsChanges.set(step.id as string, newStep);
    // As we are creating a new step execution, we need to update the workflow execution with the new step execution ID
    // Due to the fact that execution and flushes are synchronous, it's safe to use incremental approach to update the step execution IDs
    // while still keeping the order of the step execution IDs according to the global execution index
    // At the same time it's safer because we don't rely on how many step executions are loaded in resume task.
    this.updateWorkflowExecution({
      stepExecutionIds: [...(this.workflowExecution.stepExecutionIds || []), step.id as string],
    });
  }

  private updateStep(stepId: string, step: Partial<EsWorkflowStepExecution>) {
    const existingStep = this.stepExecutions.get(stepId);
    const updatedStep = {
      ...existingStep,
      ...step,
    } as EsWorkflowStepExecution;
    this.stepExecutions.set(stepId, updatedStep);
    // Accumulate changes for the next flush — merge with any pending changes
    // ES partial update (doc_as_upsert) preserves fields not included in the update
    this.stepDocumentsChanges.set(stepId, {
      ...(this.stepDocumentsChanges.get(stepId) || {}),
      ...step,
    });
  }

  /**
   * Nullifies `output` and `input` on non-latest in-memory step executions
   * for the given step IDs, reducing memory pressure after a loop completes.
   *
   * Preserves:
   * - The latest execution per stepId (needed by getContext → getLatestStepExecution)
   * - All data.set step outputs (needed by getVariables which reads all executions)
   * - All waitForInput step outputs (user-provided values that must be preserved for
   *   auditability and downstream access across all iterations)
   * - All metadata fields (needed by telemetry at terminal state)
   *
   * Note: eviction uses global-latest-wins semantics — it keeps the absolute latest
   * execution per stepId across all loop iterations, not scoped to a specific loop scope.
   * This means that after outer-loop eviction, only the latest execution from the last
   * outer iteration retains its output. This is correct because getLatestStepExecution
   * always returns the absolute latest execution.
   *
   * Does NOT touch ES-persisted documents — this is in-memory only.
   * On resume, ES documents still hold the original outputs.
   */
  public evictStaleLoopOutputs(innerStepIds: Iterable<string>): void {
    for (const stepId of innerStepIds) {
      const executionIds = this.stepIdExecutionIdIndex.get(stepId);
      if (executionIds && executionIds.length > 1) {
        const staleIds = executionIds.slice(0, -1);
        for (const execId of staleIds) {
          const stepExec = this.stepExecutions.get(execId);
          if (
            stepExec &&
            (stepExec.stepType == null || !EVICTION_EXEMPT_STEP_TYPES.has(stepExec.stepType))
          ) {
            // Replace with a shallow copy so any pending stepDocumentsChanges entry
            // for this execution is not mutated (it shares the same object reference
            // when the step was first created via createStep).
            this.stepExecutions.set(execId, { ...stepExec, output: undefined, input: undefined });
          }
        }
      }
    }
  }

  private buildStepIdExecutionIdIndex(): void {
    this.stepIdExecutionIdIndex.clear();
    for (const step of this.stepExecutions.values()) {
      let idsList = this.stepIdExecutionIdIndex.get(step.stepId);

      if (!idsList) {
        idsList = [];
        this.stepIdExecutionIdIndex.set(step.stepId, idsList);
      }

      idsList.push(step.id);
    }

    for (const [stepId, stepExecutionIds] of this.stepIdExecutionIdIndex.entries()) {
      this.stepIdExecutionIdIndex.set(
        stepId,
        stepExecutionIds.sort((a, b) => {
          const aExecution = this.stepExecutions.get(a);
          const bExecution = this.stepExecutions.get(b);
          return (aExecution?.stepExecutionIndex ?? 0) - (bExecution?.stepExecutionIndex ?? 0);
        })
      );
    }
  }
}
