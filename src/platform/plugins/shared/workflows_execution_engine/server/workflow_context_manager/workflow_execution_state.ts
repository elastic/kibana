/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

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

  constructor(
    initialWorkflowExecution: EsWorkflowExecution,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowStepExecutionRepository: StepExecutionRepository
  ) {
    this.workflowExecution = initialWorkflowExecution;
  }

  public async load(): Promise<void> {
    const foundSteps = await this.workflowStepExecutionRepository.searchStepExecutionsByExecutionId(
      this.workflowExecution.id
    );
    foundSteps.forEach((stepExecution) => this.stepExecutions.set(stepExecution.id, stepExecution));
    this.buildStepIdExecutionIdIndex();
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
      this.updateStep(step);
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
      // Include all step execution IDs sorted by execution order for O(1) mget lookup on read side
      stepExecutionIds: Array.from(this.stepExecutions.values())
        .sort((a, b) => a.globalExecutionIndex - b.globalExecutionIndex)
        .map((step) => step.id),
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
    } as EsWorkflowStepExecution;
    this.stepExecutions.set(step.id as string, newStep);
    this.stepDocumentsChanges.set(step.id as string, newStep);
  }

  private updateStep(step: Partial<EsWorkflowStepExecution>) {
    this.stepExecutions.set(step.id!, {
      ...this.stepExecutions.get(step.id!),
      ...step,
    } as EsWorkflowStepExecution);
    this.stepDocumentsChanges.set(step.id as string, {
      ...(this.stepDocumentsChanges.get(step.id as string) || {}),
      ...step,
    });
  }

  private buildStepIdExecutionIdIndex(): void {
    this.stepIdExecutionIdIndex.clear();
    for (const step of this.stepExecutions.values()) {
      if (!this.stepIdExecutionIdIndex.has(step.stepId)) {
        this.stepIdExecutionIdIndex.set(step.stepId, []);
      }
      this.stepIdExecutionIdIndex.get(step.stepId)!.push(step.id);
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
