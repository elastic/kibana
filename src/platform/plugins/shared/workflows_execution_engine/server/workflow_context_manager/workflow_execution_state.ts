/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
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
    foundSteps.forEach((stepExecution) => {
      this.stepExecutions.set(stepExecution.stepId, stepExecution);
    });
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

  public getStepExecution(stepId: string): EsWorkflowStepExecution | undefined {
    return this.stepExecutions.get(stepId);
  }

  public upsertStep(step: Partial<EsWorkflowStepExecution>): void {
    if (!step.stepId) {
      throw new Error('Step execution ID is required for update');
    }

    if (!this.stepExecutions.has(step.stepId)) {
      this.stepExecutions.set(
        step.stepId as string,
        {
          ...step,
          id: `${this.workflowExecution.id}-${step.stepId}`,
          workflowRunId: this.workflowExecution.id,
          workflowId: this.workflowExecution.workflowId,
        } as EsWorkflowStepExecution
      );
      this.stepChanges.set(step.stepId, {
        objectId: step.stepId,
        changeType: 'create',
      });
    } else {
      this.stepExecutions.set(step.stepId, {
        ...this.stepExecutions.get(step.stepId),
        ...step,
      } as EsWorkflowStepExecution);

      // only update if the step is not in changes
      if (!this.stepChanges.has(step.stepId)) {
        this.stepChanges.set(step.stepId, {
          objectId: step.stepId,
          changeType: 'update',
        });
      }
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
}
