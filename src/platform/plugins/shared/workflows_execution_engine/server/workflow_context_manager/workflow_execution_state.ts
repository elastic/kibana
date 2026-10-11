/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  StackFrame,
  WorkflowStepTokenUsage,
  WorkflowTokenUsage,
} from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { areParallelBranchesCompatible, getParallelBranchScopes } from './parallel_branch_scope';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { sumTokenUsage } from '../utils';

/** Context for the step that failed during this run; used to build workflow_execution_failed event. */
export interface FailedStepContext {
  stepId: string;
  stepName: string;
  stepExecutionId: string;
}

/**
 * Step-execution metadata held by `WorkflowExecutionState`. Excludes
 * `input` / `output` — those live in the `stepIo` map and are merged in only
 * at flush time.
 */
export type StepExecutionMetadata = Omit<EsWorkflowStepExecution, 'input' | 'output'>;

/**
 * Narrow shape required by `createStep`: `id` is mandatory at creation time;
 * `stepId` is expected but historically allowed to be undefined. `input` /
 * `output` are deliberately rejected — IO writes go through `setStepIo`, never
 * through `upsertStep`.
 */
type CreateStepInput = Omit<Partial<EsWorkflowStepExecution>, 'input' | 'output'> &
  Pick<EsWorkflowStepExecution, 'id'>;

/**
 * In-memory step/workflow document store with deferred ES persistence.
 *
 * Owns step *metadata* (status, scopeStack, error, indices, etc.), the
 * workflow-level document, and step IO (input/output). Step IO is written via
 * `setStepIo` / `getStepIo` and flushed together with metadata changes by
 * `flushStepChanges`.
 *
 * The dependency direction is: state → workflowExecutionRepository + stepExecutionRepository.
 * `StepIoService` calls state (not the reverse).
 */
export class WorkflowExecutionState {
  private stepExecutions: Map<string, StepExecutionMetadata> = new Map();
  private workflowExecution: EsWorkflowExecution;
  private workflowDocumentChanges: Partial<EsWorkflowExecution> | undefined = undefined;
  private stepDocumentsChanges: Map<string, Partial<StepExecutionMetadata>> = new Map();

  private lastFailedStepContext: FailedStepContext | undefined = undefined;

  /** Live IO for all steps — includes in-flight writes and resume-loaded inputs. */
  private stepIo = new Map<string, { input?: JsonValue; output?: JsonValue | null }>();
  /** Pending IO changes waiting for the next `flushStepChanges` call. */
  private pendingStepIo = new Map<string, { input?: JsonValue; output?: JsonValue | null }>();
  /** Finished steps whose persisted input is not in `stepIo`; see `isInputEvicted`. */
  private evictedInputIds = new Set<string>();

  /**
   * Maps step IDs to their execution IDs in chronological order. Enables
   * efficient lookup of all executions for a step that runs multiple times
   * (loops, retries).
   */
  private stepIdExecutionIdIndex = new Map<string, string[]>();

  /** Execution IDs of `data.set` steps in creation order. Avoids scanning every execution. */
  private dataSetExecutionIds = new Set<string>();
  private stepIoVersion = 0;

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private stepExecutionRepository: StepExecutionRepository
  ) {
    this.workflowExecution = initialWorkflowExecution;
  }

  public getWorkflowExecution(): EsWorkflowExecution {
    return this.workflowExecution;
  }

  public getWorkflowExecutionStatus(): EsWorkflowExecution['status'] {
    return this.workflowExecution.status;
  }

  public getWorkflowExecutionId(): string {
    return this.workflowExecution.id;
  }

  public getWorkflowExecutionScopeStack(): EsWorkflowExecution['scopeStack'] {
    return this.workflowExecution.scopeStack;
  }

  public getWorkflowExecutionStepExecutionIds(): string[] | undefined {
    return this.workflowExecution.stepExecutionIds;
  }

  public getStepExecutionIdsByStepId(stepId: string): ReadonlyArray<string> | undefined {
    return this.stepIdExecutionIdIndex.get(stepId);
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

  /**
   * Accumulates a step's normalized token usage into the per-execution total.
   */
  public accumulateUsage(usage: WorkflowTokenUsage | undefined): void {
    if (!usage) {
      return;
    }
    const accumulated = sumTokenUsage(this.workflowExecution.usage, usage);
    if (accumulated) {
      this.updateWorkflowExecution({ usage: accumulated });
    }
  }

  /**
   * Appends one step's usage entry to the per-execution list in finish order.
   */
  public recordStepUsage(stepUsage: WorkflowStepTokenUsage): void {
    const stepUsages = [...(this.workflowExecution.stepUsage ?? []), stepUsage];
    this.updateWorkflowExecution({ stepUsage: stepUsages });
  }

  public getAllStepExecutions(): StepExecutionMetadata[] {
    return Array.from(this.stepExecutions.values());
  }

  public getStepExecution(stepExecutionId: string): StepExecutionMetadata | undefined {
    return this.stepExecutions.get(stepExecutionId);
  }

  /**
   * Returns all `data.set` executions in creation order, using a maintained index.
   */
  public getDataSetStepExecutions(): StepExecutionMetadata[] {
    const result: StepExecutionMetadata[] = [];
    for (const id of this.dataSetExecutionIds) {
      const exec = this.stepExecutions.get(id);
      if (exec) result.push(exec);
    }
    return result;
  }

  /** O(1) count of `data.set` executions; lets callers cheaply detect index changes. */
  public getDataSetStepExecutionCount(): number {
    return this.dataSetExecutionIds.size;
  }

  /** Monotonic counter bumped on every `setStepIo`; lets callers memoise IO-derived aggregates. */
  public getStepIoVersion(): number {
    return this.stepIoVersion;
  }

  /**
   * Retrieves all executions for a workflow step in chronological order.
   */
  public getStepExecutionsByStepId(stepId: string): StepExecutionMetadata[] {
    const executionIds = this.stepIdExecutionIdIndex.get(stepId);
    if (!executionIds?.length) {
      return [];
    }
    const result: StepExecutionMetadata[] = [];
    for (const executionId of executionIds) {
      const exec = this.stepExecutions.get(executionId);
      if (exec) result.push(exec);
    }
    return result;
  }

  /**
   * Returns the most recent execution of `stepId`. When `stackFrames` are given, executions
   * from a sibling `parallel` branch are skipped so concurrent branches never read each other.
   */
  public getLatestStepExecution(
    stepId: string,
    stackFrames?: readonly StackFrame[]
  ): StepExecutionMetadata | undefined {
    const allExecutions = this.getStepExecutionsByStepId(stepId);
    const readerBranchScopes = stackFrames ? getParallelBranchScopes(stackFrames) : [];
    if (readerBranchScopes.length === 0) {
      return allExecutions.length ? allExecutions[allExecutions.length - 1] : undefined;
    }
    for (let index = allExecutions.length - 1; index >= 0; index--) {
      const execution = allExecutions[index];
      if (
        areParallelBranchesCompatible(
          readerBranchScopes,
          getParallelBranchScopes(execution.scopeStack ?? [])
        )
      ) {
        return execution;
      }
    }
    return undefined;
  }

  // ----- IO access ----------------------------------------------------------

  /**
   * Writes step IO (input and/or output) into the live map and queues it for
   * the next `flushStepChanges`. Called by `StepIoService.write`.
   */
  public setStepIo(
    stepExecutionId: string,
    io: { input?: JsonValue; output?: JsonValue | null }
  ): void {
    this.stepIoVersion++;
    if (io.input !== undefined) this.evictedInputIds.delete(stepExecutionId);
    const existing = this.stepIo.get(stepExecutionId) ?? {};
    this.stepIo.set(stepExecutionId, { ...existing, ...io });
    const existingPending = this.pendingStepIo.get(stepExecutionId) ?? {};
    this.pendingStepIo.set(stepExecutionId, { ...existingPending, ...io });
  }

  /**
   * Reads a step's input or output from the live map.
   * Returns `undefined` when the value has not been set or was cleared.
   */
  public getStepIo(
    stepExecutionId: string,
    type: 'input' | 'output'
  ): JsonValue | null | undefined {
    return this.stepIo.get(stepExecutionId)?.[type];
  }

  /**
   * Whether this step's input was dropped from the live map after flush (or skipped
   * at resume) and must be re-fetched from Elasticsearch to be read.
   */
  public isInputEvicted(stepExecutionId: string): boolean {
    return this.evictedInputIds.has(stepExecutionId);
  }

  /**
   * Drops flushed IO from the live map for each ID, freeing memory. The `output` is
   * always dropped. The `input` is kept only while the step is still running, so
   * foreach context re-evaluation across loop iterations keeps working; once the step
   * is finished its input is dropped too and re-fetched on demand by `StepIoService`.
   * Outputs of `data.set` steps are kept: they are small variable maps that every later
   * node reads through `variables`, so dropping them would force a refetch per node run.
   */
  public clearFlushedOutputs(ids: ReadonlyArray<string>): void {
    for (const id of ids) {
      const io = this.stepIo.get(id);
      if (io) {
        const keepInput = io.input !== undefined && !this.isStepFinished(id);
        const keepOutput = io.output !== undefined && this.dataSetExecutionIds.has(id);
        if (io.input !== undefined && !keepInput) this.evictedInputIds.add(id);
        if (keepInput || keepOutput) {
          this.stepIo.set(id, {
            ...(keepInput ? { input: io.input } : {}),
            ...(keepOutput ? { output: io.output } : {}),
          });
        } else {
          this.stepIo.delete(id);
        }
      }
    }
  }

  private isStepFinished(stepExecutionId: string): boolean {
    const status = this.stepExecutions.get(stepExecutionId)?.status;
    return status !== undefined && isTerminalStatus(status);
  }

  // ----- ES persistence primitives -----------------------------------------

  /**
   * Records a step-metadata change. `input` / `output` are *not* permitted
   * here — those flow through `setStepIo`. The compile-time `Omit` already
   * excludes them; this runtime guard catches stray callers that bypass typing
   * via casts.
   */
  public upsertStep(step: Partial<StepExecutionMetadata>): void {
    if (!step.id) {
      throw new Error('WorkflowExecutionState: Step execution must have an ID to be upserted');
    }
    if ('input' in step || 'output' in step) {
      throw new Error(
        'WorkflowExecutionState: input/output writes must go through setStepIo, not upsertStep'
      );
    }

    if (this.stepExecutions.has(step.id)) {
      this.updateStep(step.id, step);
      return;
    }

    this.createStep({ ...step, id: step.id });
  }

  /**
   * Drains pending step-document changes (metadata only). Returns an empty map
   * when nothing is pending.
   */
  public drainPendingStepChanges(): Map<string, Partial<StepExecutionMetadata>> {
    if (!this.stepDocumentsChanges.size) {
      return new Map();
    }
    const drained = this.stepDocumentsChanges;
    this.stepDocumentsChanges = new Map();
    return drained;
  }

  /**
   * Ingests step docs loaded from ES at resume time. Stores metadata only.
   */
  public ingestLoadedStepDocs(steps: ReadonlyArray<StepExecutionMetadata>): void {
    for (const step of steps) {
      this.stepExecutions.set(step.id, step);
    }
    this.buildStepIdExecutionIdIndex();
  }

  public async flushWorkflowDoc(): Promise<void> {
    if (!this.workflowDocumentChanges) {
      return;
    }
    const changes = this.workflowDocumentChanges;
    this.workflowDocumentChanges = undefined;

    const queueConcurrencyStrategy =
      this.workflowExecution.workflowDefinition?.settings?.concurrency?.strategy === 'queue';
    const refreshForQueueDrainAfterTerminal =
      Boolean(this.workflowExecution.concurrencyGroupKey) &&
      queueConcurrencyStrategy &&
      isTerminalStatus(this.workflowExecution.status);

    await this.workflowExecutionRepository.updateWorkflowExecution(
      {
        ...changes,
        id: this.workflowExecution.id,
      },
      refreshForQueueDrainAfterTerminal ? { refresh: 'wait_for' } : {}
    );
  }

  /**
   * Flushes pending step-metadata and IO changes to Elasticsearch in a single
   * `bulkUpsert`. After the write is confirmed, clears output from the live
   * IO map to free memory (inputs of still-running steps are kept for ongoing loop re-evaluation).
   */
  public async flushStepChanges(): Promise<void> {
    const metadataChanges = this.drainPendingStepChanges();
    const ioChanges = this.pendingStepIo;
    this.pendingStepIo = new Map();

    if (!metadataChanges.size && !ioChanges.size) {
      return;
    }

    const allIds = new Set([...metadataChanges.keys(), ...ioChanges.keys()]);
    const updates: Array<Partial<EsWorkflowStepExecution>> = [];
    for (const id of allIds) {
      updates.push({
        ...metadataChanges.get(id),
        ...ioChanges.get(id),
        id,
      });
    }

    try {
      await this.stepExecutionRepository.bulkUpsert(updates);
    } catch (error) {
      this.requeueStepChanges(metadataChanges, ioChanges);
      throw error;
    }
    // Skip outputs rewritten while the bulk write was in flight; the next flush persists them.
    // Metadata-only ids are included so inputs drop once a step's terminal status is flushed.
    this.clearFlushedOutputs([...allIds].filter((id) => !this.pendingStepIo.has(id)));
  }

  /**
   * Puts changes from a failed flush back in the pending maps. Changes recorded while the
   * write was in flight are newer, so they win over the restored ones.
   */
  private requeueStepChanges(
    metadataChanges: Map<string, Partial<StepExecutionMetadata>>,
    ioChanges: Map<string, { input?: JsonValue; output?: JsonValue | null }>
  ): void {
    for (const [id, changes] of metadataChanges) {
      this.stepDocumentsChanges.set(id, { ...changes, ...this.stepDocumentsChanges.get(id) });
    }
    for (const [id, io] of ioChanges) {
      this.pendingStepIo.set(id, { ...io, ...this.pendingStepIo.get(id) });
    }
  }

  /**
   * Flushes the workflow document and step changes. A terminal workflow status
   * is only written after step outputs and errors are durable, so consumers
   * that trust the terminal status never read incomplete step results.
   */
  public async flushWorkflowAndSteps(): Promise<void> {
    if (isTerminalStatus(this.workflowExecution.status)) {
      await this.flushStepChanges();
      await this.flushWorkflowDoc();
      return;
    }
    await Promise.all([this.flushWorkflowDoc(), this.flushStepChanges()]);
  }

  /**
   * Loads step execution documents from ES at resume time. Fetches all fields
   * except `output` (on-demand rehydration handles outputs via `StepIoService`).
   * Inputs of unfinished steps are loaded into the live IO map but NOT into the
   * pending map — they are already persisted in ES. Finished steps' inputs are
   * fetched on demand by `StepIoService`.
   */
  public async load(): Promise<void> {
    const stepExecutionIds = this.getWorkflowExecutionStepExecutionIds();
    if (!stepExecutionIds) {
      throw new Error(
        'WorkflowExecutionState: Workflow execution must have step execution IDs to be loaded'
      );
    }

    const docs = await this.stepExecutionRepository.getStepExecutionsByIds(
      stepExecutionIds,
      undefined,
      ['output']
    );

    const metadata: StepExecutionMetadata[] = [];
    for (const doc of docs) {
      if (doc.input !== undefined) {
        // Only running steps (e.g. an active foreach) need their input resident.
        const finished = doc.status !== undefined && isTerminalStatus(doc.status);
        if (finished) {
          this.evictedInputIds.add(doc.id);
        } else {
          const existing = this.stepIo.get(doc.id) ?? {};
          this.stepIo.set(doc.id, { ...existing, input: doc.input });
        }
      }
      const { input: _input, output: _output, ...meta } = doc;
      metadata.push(meta as StepExecutionMetadata);
    }

    this.ingestLoadedStepDocs(metadata);
  }

  private createStep(step: CreateStepInput) {
    const { id, stepId } = step;
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
      managed: Boolean(this.workflowExecution.managed),
    } as StepExecutionMetadata;
    this.stepExecutions.set(id, newStep);
    if (newStep.stepType === 'data.set') this.dataSetExecutionIds.add(id);
    this.stepDocumentsChanges.set(id, newStep);
    this.updateWorkflowExecution({
      stepExecutionIds: [...(this.workflowExecution.stepExecutionIds || []), id],
    });
  }

  private updateStep(stepId: string, step: Partial<StepExecutionMetadata>) {
    const existingStep = this.stepExecutions.get(stepId);
    if (!existingStep) {
      throw new Error(`WorkflowExecutionState: updateStep called for ${stepId} but no step exists`);
    }
    const updatedStep: StepExecutionMetadata = {
      ...existingStep,
      ...step,
    };
    this.stepExecutions.set(stepId, updatedStep);
    if (updatedStep.stepType === 'data.set') this.dataSetExecutionIds.add(stepId);
    this.stepDocumentsChanges.set(stepId, {
      ...(this.stepDocumentsChanges.get(stepId) || {}),
      ...step,
    });
  }

  private buildStepIdExecutionIdIndex(): void {
    this.stepIdExecutionIdIndex.clear();
    this.dataSetExecutionIds.clear();
    for (const step of this.stepExecutions.values()) {
      if (step.stepType === 'data.set') this.dataSetExecutionIds.add(step.id);
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
