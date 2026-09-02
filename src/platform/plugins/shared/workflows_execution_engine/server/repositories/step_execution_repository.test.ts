/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionsDataClient } from './data_access_layer';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
} from './data_access_layer/mocks';
import { StepExecutionRepository } from './step_execution_repository';

describe('StepExecutionRepository', () => {
  let underTest: StepExecutionRepository;
  let stepExecutionsDataClient: jest.Mocked<StepExecutionsDataClient>;

  beforeEach(() => {
    stepExecutionsDataClient = createMockStepDataClient();
    stepExecutionsDataClient.bulk.mockResolvedValue({ errors: false, items: [] });
    underTest = new StepExecutionRepository(stepExecutionsDataClient);
  });

  describe('bulkUpsert', () => {
    it('should successfully upsert multiple step executions', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1', status: 'completed' },
        { id: 'step-2', stepId: 'test-step-2', status: 'running' },
        { id: 'step-3', stepId: 'test-step-3', status: 'pending' },
      ];

      await underTest.bulkUpsert(stepExecutions as any);

      expect(stepExecutionsDataClient.bulk).toHaveBeenCalledWith({
        items: stepExecutions.map((stepExecution) => ({
          operation: 'upsert',
          document: stepExecution,
          retryOnConflict: 3,
        })),
        refresh: false,
      });
    });

    it('should handle empty array without making DAL call', async () => {
      await underTest.bulkUpsert([]);

      expect(stepExecutionsDataClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw error if step execution does not have an id', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1' }, { stepId: 'test-step-2' }];

      await expect(underTest.bulkUpsert(stepExecutions as any)).rejects.toThrow(
        'Step execution ID is required for upsert'
      );

      expect(stepExecutionsDataClient.bulk).not.toHaveBeenCalled();
    });

    it('should handle single step execution', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1', status: 'completed' }];

      await underTest.bulkUpsert(stepExecutions as any);

      expect(stepExecutionsDataClient.bulk).toHaveBeenCalledWith({
        items: [{ operation: 'upsert', document: stepExecutions[0], retryOnConflict: 3 }],
        refresh: false,
      });
    });

    it('should preserve all fields in partial updates', async () => {
      const stepExecutions = [
        {
          id: 'step-1',
          stepId: 'test-step-1',
          status: 'completed',
          finishedAt: '2025-10-28T10:00:00Z',
          executionTimeMs: 5000,
          output: { result: 'success' },
        },
      ];

      await underTest.bulkUpsert(stepExecutions as any);

      expect(stepExecutionsDataClient.bulk).toHaveBeenCalledWith({
        items: [{ operation: 'upsert', document: stepExecutions[0], retryOnConflict: 3 }],
        refresh: false,
      });
    });

    it('should handle multiple validation errors', async () => {
      const stepExecutions = [{ stepId: 'test-step-1' }, { stepId: 'test-step-2' }];

      await expect(underTest.bulkUpsert(stepExecutions as any)).rejects.toThrow(
        'Step execution ID is required for upsert'
      );
    });

    it('should throw with failed document details when bulk response contains errors', async () => {
      stepExecutionsDataClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { id: 'step-1', index: '.workflows-step-executions' },
          {
            id: 'step-2',
            index: '.workflows-step-executions',
            error: { type: 'document_missing_exception', reason: 'document missing' },
          },
        ],
      });

      await expect(
        underTest.bulkUpsert([
          { id: 'step-1', stepId: 'test-step-1' } as any,
          { id: 'step-2', stepId: 'test-step-2' } as any,
        ])
      ).rejects.toThrow('Failed to upsert 1 step executions:');
    });
  });

  describe('getStepExecutionsByIds', () => {
    it('should retrieve step executions by their IDs', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1', status: 'completed' },
        { id: 'step-2', stepId: 'test-step-2', status: 'running' },
      ];
      stepExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse(stepExecutions as any)
      );

      const result = await underTest.getStepExecutionsByIds(['step-1', 'step-2']);

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['step-1', 'step-2'], {
        sourceIncludes: undefined,
        sourceExcludes: undefined,
      });
      expect(result).toEqual(stepExecutions);
    });

    it('should pass sourceIncludes and sourceExcludes to getByIds', async () => {
      stepExecutionsDataClient.getByIds.mockResolvedValue(createMockGetExecutionsByIdsResponse([]));

      await underTest.getStepExecutionsByIds(['step-1'], ['id', 'output'], ['error']);

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['step-1'], {
        sourceIncludes: ['id', 'output'],
        sourceExcludes: ['error'],
      });
    });

    it('normalizes missing output to null when output was requested', async () => {
      stepExecutionsDataClient.getByIds.mockResolvedValue({
        items: [{ document: { id: 's1' } as any, index: '.workflows-step-executions' }],
        missing: [],
      });

      const result = await underTest.getStepExecutionsByIds(['s1'], ['output']);

      expect(result[0].output).toBeNull();
    });

    it('does not normalize output when output was not requested', async () => {
      stepExecutionsDataClient.getByIds.mockResolvedValue({
        items: [{ document: { id: 's1' } as any, index: '.workflows-step-executions' }],
        missing: [],
      });

      const result = await underTest.getStepExecutionsByIds(['s1']);

      expect(result[0].output).toBeUndefined();
    });
  });

  describe('searchStepExecutionsByExecutionId', () => {
    it('should search step executions by workflow run id', async () => {
      const stepExecutions = [{ id: 'step-1', stepId: 'test-step-1', workflowRunId: 'run-1' }];
      stepExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: stepExecutions.map((stepExecution) => ({ _source: stepExecution })),
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const result = await underTest.searchStepExecutionsByExecutionId('run-1');

      expect(stepExecutionsDataClient.search).toHaveBeenCalledWith({
        query: {
          match: { workflowRunId: 'run-1' },
        },
        sort: 'startedAt:desc',
        size: 10000,
      });
      expect(result).toEqual(stepExecutions);
    });
  });
});
