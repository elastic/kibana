/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type {
  StepExecutionField,
  StepExecutionRepository,
} from '../../server/repositories/step_execution_repository';

export class StepExecutionRepositoryMock implements Required<StepExecutionRepository> {
  public stepExecutions = new Map<string, EsWorkflowStepExecution>();
  public searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    return Promise.resolve(
      Array.from(this.stepExecutions.values()).filter((step) => step.workflowRunId === executionId)
    );
  }

  public getStepExecutionsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[]
  ): Promise<EsWorkflowStepExecution[]> {
    const results = stepExecutionIds
      .map((id) => this.stepExecutions.get(id) || null)
      .filter((step): step is EsWorkflowStepExecution => step !== null)
      .map((step) => {
        const filtered = { ...step };
        if (sourceIncludes?.length) {
          const includeSet = new Set<string>(sourceIncludes);
          for (const key of Object.keys(filtered)) {
            if (!includeSet.has(key)) {
              delete (filtered as Record<string, unknown>)[key];
            }
          }
        }
        if (sourceExcludes?.length) {
          for (const field of sourceExcludes) {
            delete (filtered as Record<string, unknown>)[field];
          }
        }
        return filtered;
      });
    return Promise.resolve(results);
  }

  public getStepExecutionsByWorkflowExecution(
    workflowExecutionId: string,
    _stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    return this.searchStepExecutionsByExecutionId(workflowExecutionId);
  }

  public bulkUpsert(stepExecutions: Partial<EsWorkflowStepExecution>[]): Promise<void> {
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
