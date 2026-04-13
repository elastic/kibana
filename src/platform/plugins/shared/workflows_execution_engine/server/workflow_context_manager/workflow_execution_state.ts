/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

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

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowStepExecutionRepository: StepExecutionRepository
  ) {
    this.workflowExecution = initialWorkflowExecution;
  }

  public async load(): Promise<void> {
    if (!this.workflowExecution.stepExecutionIds) {
      throw new Error(
        'WorkflowExecutionState: Workflow execution must have step execution IDs to be loaded'
      );
    }

    const foundSteps = await this.workflowStepExecutionRepository.getStepExecutionsByIds(
      this.workflowExecution.stepExecutionIds
    );
    foundSteps.forEach((stepExecution) => this.stepExecutions.set(stepExecution.id, stepExecution));
    this.buildStepIdExecutionIdIndex();
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

  public async flushStepChanges(): Promise<void> {
    if (!this.stepDocumentsChanges.size) {
      return;
    }
    const stepDocumentsChanges = Array.from(this.stepDocumentsChanges.values());

    this.stepDocumentsChanges.clear();
    await this.workflowStepExecutionRepository.bulkUpsert(stepDocumentsChanges);
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
