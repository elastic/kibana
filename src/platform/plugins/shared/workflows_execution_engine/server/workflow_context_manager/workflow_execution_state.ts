/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepIoService, StepIoStateAccessor } from './step_io_service';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/** Context for the step that failed during this run; used to build workflow_execution_failed event. */
export interface FailedStepContext {
  stepId: string;
  stepName: string;
  stepExecutionId: string;
}

/**
 * In-memory step/workflow document store with deferred ES persistence.
 *
 * Owns the canonical step-execution map, change tracking, and the bulk
 * upsert path. The IO lifecycle (input/output reads, output-size
 * tracking, eviction, on-demand rehydration) lives in `StepIoService`,
 * which mutates step `input`/`output` here via the three narrow,
 * memory-only mutators (`clearStepOutputInMemory`,
 * `clearStepInputInMemory`, `restoreStepOutputInMemory`).
 *
 * The service is registered after construction via `setIoService` so
 * the bidirectional dependency (state ↔ service) can be wired in
 * either order in `setup_dependencies.ts`.
 */
export class WorkflowExecutionState {
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private workflowExecution: EsWorkflowExecution;
  private workflowDocumentChanges: Partial<EsWorkflowExecution> | undefined = undefined;
  private stepDocumentsChanges: Map<string, Partial<EsWorkflowStepExecution>> = new Map();

  private lastFailedStepContext: FailedStepContext | undefined = undefined;

  /**
   * Maps step IDs to their execution IDs in chronological order. Enables
   * efficient lookup of all executions for a step that runs multiple times
   * (loops, retries).
   */
  private stepIdExecutionIdIndex = new Map<string, string[]>();

  private ioService: StepIoService | undefined;

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowStepExecutionRepository: StepExecutionRepository
  ) {
    this.workflowExecution = initialWorkflowExecution;
  }

  /**
   * Wires in the IO service after construction. Must be called before any
   * load/flush/runtime activity. Throws on a second call to make accidental
   * re-wiring loud.
   */
  public setIoService(ioService: StepIoService): void {
    if (this.ioService) {
      throw new Error('WorkflowExecutionState: IO service already registered');
    }
    this.ioService = ioService;
  }

  /**
   * Narrow accessor exposed to `StepIoService`. Defined as an instance
   * property whose methods close over `this`, so the service can be
   * constructed with a stable adapter before the state knows about it.
   */
  public readonly ioStateAccessor: StepIoStateAccessor = {
    getStepExecution: (id) => this.stepExecutions.get(id),
    getLatestStepExecution: (stepId) => this.getLatestStepExecution(stepId),
    upsertStep: (step) => this.upsertStep(step),
    clearStepOutputInMemory: (id) => this.clearStepOutputInMemory(id),
    clearStepInputInMemory: (id) => this.clearStepInputInMemory(id),
    restoreStepOutputInMemory: (id, output) => this.restoreStepOutputInMemory(id, output),
    getWorkflowExecutionStatus: () => this.workflowExecution.status,
    getWorkflowExecutionId: () => this.workflowExecution.id,
    getWorkflowExecutionScopeStack: () => this.workflowExecution.scopeStack,
  };

  /**
   * Loads step executions from Elasticsearch for a resumed workflow.
   *
   * To reduce memory footprint, outputs are excluded from the initial fetch.
   * The IO service marks non-pinned steps as deferred (rehydrated on demand
   * by `prepareForRead`) and identifies the pinned IDs whose outputs must be
   * eagerly fetched (data.set is read globally by getVariables; waitForInput
   * answers must always be present).
   */
  public async load(): Promise<void> {
    if (!this.workflowExecution.stepExecutionIds) {
      throw new Error(
        'WorkflowExecutionState: Workflow execution must have step execution IDs to be loaded'
      );
    }
    const ioService = this.requireIoService();

    // Step 1: fetch step metadata without `output` (potentially large).
    const foundSteps = await this.workflowStepExecutionRepository.getStepExecutionsByIds(
      this.workflowExecution.stepExecutionIds,
      undefined,
      ['output']
    );
    foundSteps.forEach((stepExecution) => this.stepExecutions.set(stepExecution.id, stepExecution));

    // Step 2: ask the IO service to register deferred-output bookkeeping
    // and tell us which pinned steps need eager output fetch.
    const { pinnedIdsToFetch } = ioService.onLoad(foundSteps);

    // Step 3: kick off the pinned-output fetch concurrently with the index build.
    const pinnedOutputsPromise =
      pinnedIdsToFetch.length > 0
        ? this.workflowStepExecutionRepository.getStepExecutionsByIds(pinnedIdsToFetch, [
            'id',
            'output',
          ])
        : Promise.resolve([]);

    this.buildStepIdExecutionIdIndex();

    const pinnedOutputs = await pinnedOutputsPromise;
    for (const doc of pinnedOutputs) {
      const existing = this.stepExecutions.get(doc.id);
      if (existing) {
        existing.output = doc.output;
      }
    }
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
   * Retrieves all executions for a workflow step in chronological order.
   * Returns `[]` when the step has not executed yet.
   */
  public getStepExecutionsByStepId(stepId: string): EsWorkflowStepExecution[] {
    const executionIds = this.stepIdExecutionIdIndex.get(stepId);
    if (!executionIds) {
      return [];
    }
    return executionIds.map(
      (executionId) => this.stepExecutions.get(executionId) as EsWorkflowStepExecution
    );
  }

  public getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined {
    const allExecutions = this.getStepExecutionsByStepId(stepId);
    return allExecutions.length ? allExecutions[allExecutions.length - 1] : undefined;
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

  public async flushStepChanges(): Promise<void> {
    const ioService = this.ioService;
    if (!this.stepDocumentsChanges.size) {
      // No new doc changes — but the IO service may still have a pending
      // eviction queue from the previous flush cycle that needs draining
      // on its scheduled tick.
      ioService?.onStepsFlushed([]);
      return;
    }
    const flushedIds = Array.from(this.stepDocumentsChanges.keys());
    const stepDocumentsChanges = Array.from(this.stepDocumentsChanges.values());

    this.stepDocumentsChanges.clear();
    await this.workflowStepExecutionRepository.bulkUpsert(stepDocumentsChanges);

    ioService?.onStepsFlushed(flushedIds);
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
    const stepExecutions = this.getStepExecutionsByStepId(step.stepId as string);
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
    // Execution and flushes are synchronous, so an incremental update here
    // preserves the global execution order without depending on what was
    // loaded by the resume task.
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
    // Accumulate changes for the next flush — merge with any pending changes.
    // ES partial update (doc_as_upsert) preserves fields not included.
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
   * - The latest execution per stepId (needed by `getLatestStepExecution`).
   * - All pinned step types (`data.set` outputs are read globally by
   *   `getVariables`; `waitForInput` answers must persist for auditability).
   * - All metadata fields (status, timing, scopeStack, error) — those still
   *   matter at terminal state for telemetry and UI.
   *
   * Eviction here uses global-latest-wins semantics: only the absolute latest
   * execution per stepId across all loop iterations retains its IO. After
   * outer-loop completion, only the latest execution from the last outer
   * iteration keeps its output. Correct because `getLatestStepExecution`
   * always returns the absolute latest.
   *
   * Memory-only — ES-persisted documents are untouched and on resume still
   * hold the original outputs.
   */
  public evictStaleLoopOutputs(innerStepIds: Iterable<string>): void {
    const ioService = this.requireIoService();
    for (const stepId of innerStepIds) {
      const executionIds = this.stepIdExecutionIdIndex.get(stepId);
      if (executionIds && executionIds.length > 1) {
        const staleIds = executionIds.slice(0, -1);
        for (const execId of staleIds) {
          ioService.clearStepIo(execId);
        }
      }
    }
  }

  // ----- IO mutators (memory-only) -----------------------------------------
  // The only places where `step.input` / `step.output` are mutated out-of-band
  // relative to `stepDocumentsChanges`. They replace the entry in
  // `stepExecutions` with a shallow copy rather than mutating in place, because
  // `createStep` stores the same object reference in both `stepExecutions` and
  // `stepDocumentsChanges`. An in-place mutation would corrupt a pending flush
  // payload — the step would be upserted to ES with `output: undefined`,
  // contradicting the "memory-only" contract.

  private clearStepOutputInMemory(stepExecutionId: string): void {
    const step = this.stepExecutions.get(stepExecutionId);
    if (step) {
      this.stepExecutions.set(stepExecutionId, { ...step, output: undefined });
    }
  }

  private clearStepInputInMemory(stepExecutionId: string): void {
    const step = this.stepExecutions.get(stepExecutionId);
    if (step) {
      this.stepExecutions.set(stepExecutionId, { ...step, input: undefined });
    }
  }

  private restoreStepOutputInMemory(stepExecutionId: string, output: JsonValue | null): void {
    const step = this.stepExecutions.get(stepExecutionId);
    if (step) {
      // `null` is a legitimate FAILED-step value; `undefined` is not produced
      // by this path. Same shallow-copy guard as the clear mutators.
      this.stepExecutions.set(stepExecutionId, {
        ...step,
        output: output as JsonValue,
      });
    }
  }

  private requireIoService(): StepIoService {
    if (!this.ioService) {
      throw new Error('WorkflowExecutionState: IO service not registered');
    }
    return this.ioService;
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
