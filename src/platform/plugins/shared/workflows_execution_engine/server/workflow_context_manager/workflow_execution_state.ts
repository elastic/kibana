/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { v4 as generateUuid } from 'uuid';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';

interface Change {
  objectId: string;
  changeType: 'create' | 'update';
}

export class WorkflowExecutionState {
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private workflowExecution: EsWorkflowExecution;
  private workflowChanges: Map<string, Change> = new Map();
  private stepChanges: Map<string, Change> = new Map();

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
    this.workflowChanges.set(this.workflowExecution.id, {
      objectId: this.workflowExecution.id,
      changeType: 'update',
    });
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

    return this.stepIdExecutionIdIndex
      .get(stepId)!
      .map((executionId) => this.stepExecutions.get(executionId) as EsWorkflowStepExecution);
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
      this.createStep(step);
    } else {
      this.updateStep(step);
    }
  }

  public async flush(): Promise<void> {
    const workflowChanges = Array.from(this.workflowChanges.values());
    const tasks: Promise<void>[] = [];

    if (workflowChanges.length > 0) {
      tasks.push(this.workflowExecutionRepository.updateWorkflowExecution(this.workflowExecution));
    }

    const stepChanges = Array.from(this.stepChanges.values());

    if (stepChanges.length > 0) {
      const createChanges = stepChanges.filter((change) => change.changeType === 'create');

      if (createChanges.length > 0) {
        createChanges.forEach((change) =>
          tasks.push(
            this.workflowStepExecutionRepository.createStepExecution(
              this.stepExecutions.get(change.objectId) as EsWorkflowStepExecution
            )
          )
        );
      }

      const updateChanges = stepChanges.filter((change) => change.changeType === 'update');

      if (updateChanges.length > 0) {
        tasks.push(
          this.workflowStepExecutionRepository.updateStepExecutions(
            updateChanges.map(
              (change) => this.stepExecutions.get(change.objectId) as EsWorkflowStepExecution
            )
          )
        );
      }
    }

    await Promise.all(tasks);

    this.workflowChanges.clear();
    this.stepChanges.clear();
  }

  private createStep(step: Partial<EsWorkflowStepExecution>) {
    const stepExecutionId = generateUuid();
    const stepExecutions = this.getStepExecutionsByStepId(step.stepId as string) || [];
    if (!stepExecutions.length) {
      this.stepIdExecutionIdIndex.set(step.stepId as string, []);
    }
    this.stepIdExecutionIdIndex.get(step.stepId as string)!.push(stepExecutionId as string);
    this.stepExecutions.set(
      stepExecutionId as string,
      {
        ...step,
        id: stepExecutionId,
        executionIndex: stepExecutions.length,
        workflowRunId: this.workflowExecution.id,
        workflowId: this.workflowExecution.workflowId,
      } as EsWorkflowStepExecution
    );
    this.stepChanges.set(stepExecutionId, {
      objectId: stepExecutionId,
      changeType: 'create',
    });
  }

  private updateStep(step: Partial<EsWorkflowStepExecution>) {
    this.stepExecutions.set(step.id!, {
      ...this.stepExecutions.get(step.id!),
      ...step,
    } as EsWorkflowStepExecution);

    // only update if the step is not in changes
    if (!this.stepChanges.has(step.id!)) {
      this.stepChanges.set(step.id!, {
        objectId: step.id!,
        changeType: 'update',
      });
    }
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
          return (aExecution?.executionIndex ?? 0) - (bExecution?.executionIndex ?? 0);
        })
      );
    }
  }
}
