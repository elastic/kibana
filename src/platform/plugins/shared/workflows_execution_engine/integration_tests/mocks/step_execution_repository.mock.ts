/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution, SerializedError } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { DocumentLocatorsById } from '../../server/repositories/document_version';
import type {
  StepExecutionField,
  StepExecutionRepository,
  StepExecutionWrite,
} from '../../server/repositories/step_execution_repository';

const TEST_INDEX = '.ds-.workflows-step-executions-2026.06.22-000001';
const createLocator = (index = TEST_INDEX) => ({
  index,
  seqNo: 1,
  primaryTerm: 1,
});

export class StepExecutionRepositoryMock implements Required<StepExecutionRepository> {
  public stepExecutions = new Map<string, EsWorkflowStepExecution>();

  public resolveWriteIndex(): Promise<string> {
    return Promise.resolve(TEST_INDEX);
  }

  public searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    return Promise.resolve(
      Array.from(this.stepExecutions.values()).filter((step) => step.workflowRunId === executionId)
    );
  }

  public async searchStepExecutionsWithLocatorsByExecutionId(
    executionId: string
  ): Promise<{ docs: EsWorkflowStepExecution[]; locators: DocumentLocatorsById }> {
    const docs = await this.searchStepExecutionsByExecutionId(executionId);
    return {
      docs,
      locators: Object.fromEntries(docs.map((doc) => [doc.id, createLocator()])),
    };
  }

  public getStepExecutionsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[],
    _stepsExecutionIndex?: string
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
        if (
          sourceIncludes?.includes('output' as StepExecutionField) &&
          filtered.output === undefined
        ) {
          filtered.output = null;
        }
        return filtered;
      });
    return Promise.resolve(results);
  }

  public async getStepExecutionsWithLocatorsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[],
    stepsExecutionIndex?: string
  ): Promise<{ docs: EsWorkflowStepExecution[]; locators: DocumentLocatorsById }> {
    const docs = await this.getStepExecutionsByIds(
      stepExecutionIds,
      sourceIncludes,
      sourceExcludes,
      stepsExecutionIndex
    );
    return {
      docs,
      locators: Object.fromEntries(docs.map((doc) => [doc.id, createLocator()])),
    };
  }

  public getStepExecutionsByWorkflowExecution(
    workflowExecutionId: string,
    _stepsExecutionWriteIndex?: string,
    _stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    return this.searchStepExecutionsByExecutionId(workflowExecutionId);
  }

  public async markNonTerminalStepsFailed(
    workflowExecutionId: string,
    error: SerializedError,
    _stepsExecutionIndex?: string
  ): Promise<void> {
    const stepExecutions = await this.searchStepExecutionsByExecutionId(workflowExecutionId);
    const nonTerminalSteps = stepExecutions.filter((step) => !isTerminalStatus(step.status));

    if (nonTerminalSteps.length === 0) {
      return;
    }

    const finishedAt = new Date().toISOString();
    await this.bulkUpsert(
      nonTerminalSteps.map((step) => ({
        operation: 'update',
        doc: {
          id: step.id,
          status: ExecutionStatus.FAILED,
          error,
          finishedAt,
        },
        locator: createLocator(),
      }))
    );
  }

  public bulkUpsert(writes: StepExecutionWrite[]): Promise<DocumentLocatorsById> {
    const locators: DocumentLocatorsById = {};
    for (const write of writes) {
      if (!write.doc.id) {
        throw new Error('Step execution ID is required for upsert');
      }

      this.stepExecutions.set(write.doc.id, {
        ...(this.stepExecutions.get(write.doc.id) || {}),
        ...(write.doc as EsWorkflowStepExecution),
      });
      locators[write.doc.id] = createLocator(
        write.operation === 'update' ? write.locator.index : TEST_INDEX
      );
    }
    return Promise.resolve(locators);
  }
}
