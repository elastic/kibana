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
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { formatBytes } from '../step/errors';

export class WorkflowExecutionState {
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private workflowExecution: EsWorkflowExecution;
  private workflowDocumentChanges: Partial<EsWorkflowExecution> | undefined = undefined;
  private stepDocumentsChanges: Map<string, Partial<EsWorkflowStepExecution>> = new Map();

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
    this.buildStepIdExecutionIdIndex();

    // Mark non-data.set steps as deferred so rehydrateOutputs() will fetch them on demand.
    // data.set outputs are pinned (needed globally by getVariables()) and eagerly loaded below.
    const dataSetIds: string[] = [];
    for (const step of foundSteps) {
      if (step.stepType === 'data.set') {
        dataSetIds.push(step.id);
      } else {
        this.evictedOutputIdsAndBytes.set(step.id, 0);
      }
    }

    // Eagerly load data.set outputs so getVariables() works without rehydration
    if (dataSetIds.length > 0) {
      const dataSetOutputs = await this.workflowStepExecutionRepository.getStepExecutionsByIds(
        dataSetIds,
        ['id', 'output']
      );
      for (const doc of dataSetOutputs) {
        const existing = this.stepExecutions.get(doc.id);
        if (existing) {
          existing.output = doc.output;
        }
      }
    }

    this.logger?.debug(
      `Loaded ${foundSteps.length} step(s) with deferred outputs (${dataSetIds.length} data.set outputs eagerly loaded)`
    );
  }

  public getWorkflowExecution(): EsWorkflowExecution {
    return this.workflowExecution;
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
  public getOutputSizeStats(): { totalBytes: number; stepCount: number } {
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
   * Evicts large outputs from completed steps to reduce memory footprint.
   * Only evicts steps that:
   * - Are in a terminal state (COMPLETED or FAILED)
   * - Have a recorded output size above the eviction threshold
   * - Are not `data.set` steps (whose outputs are needed globally by `getVariables()`)
   * - Have not already been evicted
   *
   * This is a memory-only operation — the output data remains in Elasticsearch.
   * It does NOT modify `stepDocumentsChanges`, so the next flush will not
   * accidentally overwrite the persisted output in ES.
   */
  /**
   * Evaluates the given step execution IDs for eviction eligibility and evicts
   * large outputs from completed steps. Only the provided candidate IDs are
   * checked — callers should pass only the IDs that were just flushed to ES.
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

    // data.set outputs are pinned — getVariables() reads ALL data.set outputs globally
    if (step.stepType === 'data.set') {
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
