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
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/** Context for the step that failed during this run; used to build workflow_execution_failed event. */
export interface FailedStepContext {
  stepId: string;
  stepName: string;
  stepExecutionId: string;
}

/**
 * Narrow shape required by `createStep`: `id` is mandatory at creation time;
 * `stepId` is *expected* but historically allowed to be undefined (status-only
 * seed writes that fill it in on a later upsert). Defined here so the call
 * site can drop `as string` casts on `id` while preserving the loose contract.
 */
type CreateStepInput = Partial<EsWorkflowStepExecution> & Pick<EsWorkflowStepExecution, 'id'>;

/**
 * Narrow view of `WorkflowExecutionState` used by `StepIoService`. State has
 * no compile-time knowledge of the service: this interface lives in the file
 * that defines the producer (state) so the dependency graph is one-way —
 * service depends on state, state depends on nothing in the IO layer.
 */
export interface StepIoStateAccessor {
  // Reads
  getStepExecution(stepExecutionId: string): EsWorkflowStepExecution | undefined;
  getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined;
  getAllStepExecutions(): EsWorkflowStepExecution[];
  upsertStep(step: Partial<EsWorkflowStepExecution>): void;

  // Memory-only mutators — do NOT add entries to stepDocumentsChanges.
  clearStepOutputInMemory(stepExecutionId: string): void;
  clearStepInputInMemory(stepExecutionId: string): void;
  restoreStepOutputInMemory(stepExecutionId: string, output: JsonValue | null): void;

  // Workflow-level reads.
  getWorkflowExecutionStatus(): EsWorkflowExecution['status'];
  getWorkflowExecutionId(): string;
  getWorkflowExecutionScopeStack(): EsWorkflowExecution['scopeStack'];
  getWorkflowExecutionStepExecutionIds(): string[] | undefined;

  // Stale-loop helper: chronologically-ordered execution ids per stepId.
  getStepExecutionIdsByStepId(stepId: string): ReadonlyArray<string> | undefined;

  // ES persistence primitives. State drives the bulk upsert / mget; the
  // service composes them with eviction + size bookkeeping.
  flushStepDocs(): Promise<ReadonlyArray<string>>;
  flushWorkflowDoc(): Promise<void>;
  loadStepDocsWithoutOutput(): Promise<EsWorkflowStepExecution[]>;
  loadStepOutputs(stepExecutionIds: ReadonlyArray<string>): Promise<void>;
}

/**
 * In-memory step/workflow document store with deferred ES persistence.
 *
 * Owns the canonical step-execution map, change tracking, and the bulk
 * upsert / mget primitives. Knows nothing about output eviction, size
 * tracking, or rehydration — those live in `StepIoService`, which composes
 * the primitives exposed via `ioStateAccessor`.
 *
 * The dependency is strictly one-way: state → repositories; service → state.
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

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowStepExecutionRepository: StepExecutionRepository
  ) {
    this.workflowExecution = initialWorkflowExecution;
  }

  /**
   * Narrow accessor consumed by `StepIoService`. Defined as an instance
   * property whose methods close over `this` so the service can be
   * constructed with this stable adapter immediately after state is built.
   */
  public readonly ioStateAccessor: StepIoStateAccessor = {
    getStepExecution: (id) => this.stepExecutions.get(id),
    getLatestStepExecution: (stepId) => this.getLatestStepExecution(stepId),
    getAllStepExecutions: () => this.getAllStepExecutions(),
    upsertStep: (step) => this.upsertStep(step),
    clearStepOutputInMemory: (id) => this.clearStepOutputInMemory(id),
    clearStepInputInMemory: (id) => this.clearStepInputInMemory(id),
    restoreStepOutputInMemory: (id, output) => this.restoreStepOutputInMemory(id, output),
    getWorkflowExecutionStatus: () => this.workflowExecution.status,
    getWorkflowExecutionId: () => this.workflowExecution.id,
    getWorkflowExecutionScopeStack: () => this.workflowExecution.scopeStack,
    getWorkflowExecutionStepExecutionIds: () => this.workflowExecution.stepExecutionIds,
    getStepExecutionIdsByStepId: (stepId) => this.stepIdExecutionIdIndex.get(stepId),
    flushStepDocs: () => this.flushStepDocs(),
    flushWorkflowDoc: () => this.flushWorkflowDoc(),
    loadStepDocsWithoutOutput: () => this.loadStepDocsWithoutOutput(),
    loadStepOutputs: (ids) => this.loadStepOutputs(ids),
  };

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
   *
   * Skips IDs missing from the canonical map (rather than asserting them
   * with a cast). The index and the canonical map are kept in sync by
   * `createStep` / `buildStepIdExecutionIdIndex`, but a defensive skip
   * keeps a future bug from surfacing as a downstream `undefined`.
   */
  public getStepExecutionsByStepId(stepId: string): EsWorkflowStepExecution[] {
    const executionIds = this.stepIdExecutionIdIndex.get(stepId);
    if (!executionIds?.length) {
      return [];
    }
    const result: EsWorkflowStepExecution[] = [];
    for (const executionId of executionIds) {
      const exec = this.stepExecutions.get(executionId);
      if (exec) result.push(exec);
    }
    return result;
  }

  public getLatestStepExecution(stepId: string): EsWorkflowStepExecution | undefined {
    const allExecutions = this.getStepExecutionsByStepId(stepId);
    return allExecutions.length ? allExecutions[allExecutions.length - 1] : undefined;
  }

  public upsertStep(step: Partial<EsWorkflowStepExecution>): void {
    if (!step.id) {
      throw new Error('WorkflowExecutionState: Step execution must have an ID to be upserted');
    }

    if (this.stepExecutions.has(step.id)) {
      this.updateStep(step.id, step);
      return;
    }

    this.createStep({ ...step, id: step.id });
  }

  // ----- ES persistence primitives -----------------------------------------
  // These are deliberately atomic: they only flush whatever doc changes are
  // currently buffered. Higher-level lifecycle (deferred eviction, input
  // eviction, etc.) lives in `StepIoService` and composes these primitives.

  /**
   * Bulk-upserts pending step document changes. Returns the IDs that were
   * flushed (or `[]` if nothing was pending). The service uses the returned
   * IDs to drive deferred output eviction and immediate input eviction.
   */
  private async flushStepDocs(): Promise<ReadonlyArray<string>> {
    if (!this.stepDocumentsChanges.size) {
      return [];
    }
    const flushedIds = Array.from(this.stepDocumentsChanges.keys());
    const stepDocumentsChanges = Array.from(this.stepDocumentsChanges.values());

    this.stepDocumentsChanges.clear();
    await this.workflowStepExecutionRepository.bulkUpsert(stepDocumentsChanges);
    return flushedIds;
  }

  private async flushWorkflowDoc(): Promise<void> {
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

  /**
   * Fetches step metadata for all known step execution ids, excluding the
   * (potentially large) `output` field. Populates `stepExecutions` and
   * (re)builds the chronological index. Returns the loaded docs so callers
   * (the service) can decide which subset needs an eager output fetch.
   */
  private async loadStepDocsWithoutOutput(): Promise<EsWorkflowStepExecution[]> {
    if (!this.workflowExecution.stepExecutionIds) {
      throw new Error(
        'WorkflowExecutionState: Workflow execution must have step execution IDs to be loaded'
      );
    }
    const foundSteps = await this.workflowStepExecutionRepository.getStepExecutionsByIds(
      this.workflowExecution.stepExecutionIds,
      undefined,
      ['output']
    );
    foundSteps.forEach((stepExecution) => this.stepExecutions.set(stepExecution.id, stepExecution));
    this.buildStepIdExecutionIdIndex();
    return foundSteps;
  }

  /**
   * Fetches `id` and `output` only for the given step execution ids and
   * applies the outputs to the in-memory docs. Used for the resume-time
   * eager-output fetch of pinned step types.
   */
  private async loadStepOutputs(stepExecutionIds: ReadonlyArray<string>): Promise<void> {
    if (stepExecutionIds.length === 0) {
      return;
    }
    const docs = await this.workflowStepExecutionRepository.getStepExecutionsByIds(
      Array.from(stepExecutionIds),
      ['id', 'output']
    );
    for (const doc of docs) {
      const existing = this.stepExecutions.get(doc.id);
      if (existing) {
        existing.output = doc.output;
      }
    }
  }

  private createStep(step: CreateStepInput) {
    const { id, stepId } = step;
    // Index entry is keyed by stepId — only register when we actually have
    // one (a partial seed write may not). The index is rebuilt on resume.
    let previousExecutionCount = 0;
    if (stepId) {
      let executionIds = this.stepIdExecutionIdIndex.get(stepId);
      previousExecutionCount = executionIds?.length ?? 0;
      if (!executionIds) {
        executionIds = [];
        this.stepIdExecutionIdIndex.set(stepId, executionIds);
      }
      executionIds.push(id);
    }

    // `scopeStack` is required on the doc; default to an empty array so we
    // never write `undefined` into ES (callers in the engine always supply
    // it, but this guards against a future Partial caller).
    //
    // The cast at the end is intentional: `EsWorkflowStepExecution` requires
    // `status` / `startedAt` / `topologicalIndex`, but a minimal "create
    // shell" call (e.g. just to seed `state` or `output`) may not have them.
    // Those fields are populated on the next `updateStep`, and ES partial-
    // update semantics tolerate missing fields on doc_as_upsert. Tightening
    // the type here would force every caller to pre-fill placeholders.
    const newStep = {
      ...step,
      id,
      scopeStack: step.scopeStack ?? [],
      globalExecutionIndex: this.stepExecutions.size,
      stepExecutionIndex: previousExecutionCount,
      workflowRunId: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
      spaceId: this.workflowExecution.spaceId,
      isTestRun: Boolean(this.workflowExecution.isTestRun),
    } as EsWorkflowStepExecution;
    this.stepExecutions.set(id, newStep);
    this.stepDocumentsChanges.set(id, newStep);
    // Execution and flushes are synchronous, so an incremental update here
    // preserves the global execution order without depending on what was
    // loaded by the resume task.
    this.updateWorkflowExecution({
      stepExecutionIds: [...(this.workflowExecution.stepExecutionIds || []), id],
    });
  }

  private updateStep(stepId: string, step: Partial<EsWorkflowStepExecution>) {
    const existingStep = this.stepExecutions.get(stepId);
    if (!existingStep) {
      // upsertStep already routed us through createStep when the step was
      // missing — reaching this branch with no existing step is a logic bug.
      throw new Error(`WorkflowExecutionState: updateStep called for ${stepId} but no step exists`);
    }
    const updatedStep: EsWorkflowStepExecution = {
      ...existingStep,
      ...step,
    };
    this.stepExecutions.set(stepId, updatedStep);
    // Accumulate changes for the next flush — merge with any pending changes.
    // ES partial update (doc_as_upsert) preserves fields not included.
    this.stepDocumentsChanges.set(stepId, {
      ...(this.stepDocumentsChanges.get(stepId) || {}),
      ...step,
    });
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
