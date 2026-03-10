/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepository } from '../../server/repositories/step_execution_repository';

export class StepExecutionRepositoryMock implements Required<StepExecutionRepository> {
  public stepExecutions = new Map<string, EsWorkflowStepExecution>();

  public resolveWriteIndex(): Promise<string> {
    return Promise.resolve('.workflows-step-executions-000001');
  }

  public getStepExecutionsByIds(
    stepExecutionIds: string[],
    _stepsExecutionIndex?: string
  ): Promise<EsWorkflowStepExecution[]> {
    const results: EsWorkflowStepExecution[] = [];
    for (const id of stepExecutionIds) {
      const step = this.stepExecutions.get(id);
      if (step) {
        results.push(step);
      }
    }
    return Promise.resolve(results);
  }

  public searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    return Promise.resolve(
      Array.from(this.stepExecutions.values()).filter((step) => step.workflowRunId === executionId)
    );
  }

  public getStepExecutionsByWorkflowExecution(
    workflowExecutionId: string,
    _stepsExecutionWriteIndex?: string,
    _stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    return this.searchStepExecutionsByExecutionId(workflowExecutionId);
  }

  public bulkUpsert(
    stepExecutions: Partial<EsWorkflowStepExecution>[],
    _targetIndex: string
  ): Promise<void> {
    for (const stepExecution of stepExecutions) {
      if (!stepExecution.id) {
        throw new Error('Step execution ID is required for upsert');
      }

      this.stepExecutions.set(stepExecution.id, {
        ...(this.stepExecutions.get(stepExecution.id) || {}),
        ...(stepExecution as EsWorkflowStepExecution),
      });
    }
    return Promise.resolve();
  }
}
