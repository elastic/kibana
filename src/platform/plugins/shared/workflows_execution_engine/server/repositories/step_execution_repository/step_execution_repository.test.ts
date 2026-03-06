/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionDataStreamClient } from './data_stream';
import { StepExecutionRepository } from './step_execution_repository';

describe('StepExecutionRepository', () => {
  let repository: StepExecutionRepository;
  let mockDataStreamClient: jest.Mocked<StepExecutionDataStreamClient>;

  beforeEach(() => {
    mockDataStreamClient = {
      search: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<StepExecutionDataStreamClient>;

    const mockEsClient = {} as any;
    repository = new StepExecutionRepository(mockDataStreamClient, mockEsClient);
  });

  describe('searchStepExecutionsByExecutionId', () => {
    it('should search step executions by workflow execution ID', async () => {
      const stepExecutions = [
        { id: 'step-1', workflowRunId: 'exec-1', status: 'completed' },
        { id: 'step-2', workflowRunId: 'exec-1', status: 'running' },
      ];

      mockDataStreamClient.search.mockResolvedValue({
        hits: {
          hits: stepExecutions.map((se) => ({ _source: se })),
        },
      } as any);

      const result = await repository.searchStepExecutionsByExecutionId('exec-1');

      expect(mockDataStreamClient.search).toHaveBeenCalledWith({
        query: {
          match: { workflowRunId: 'exec-1' },
        },
        sort: [{ startedAt: { order: 'desc' } }],
        size: 10000,
      });
      expect(result).toEqual(stepExecutions);
    });

    it('should return empty array when no results found', async () => {
      mockDataStreamClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      const result = await repository.searchStepExecutionsByExecutionId('exec-1');
      expect(result).toEqual([]);
    });
  });

  describe('bulkCreate', () => {
    it('should create step executions via data stream client', async () => {
      const stepExecutions = [
        { id: 'step-1', stepId: 'test-step-1', status: 'completed' },
        { id: 'step-2', stepId: 'test-step-2', status: 'running' },
      ];

      await repository.bulkCreate(stepExecutions as any);

      expect(mockDataStreamClient.create).toHaveBeenCalledWith({
        documents: stepExecutions,
      });
    });

    it('should handle empty array without making data stream call', async () => {
      await repository.bulkCreate([]);

      expect(mockDataStreamClient.create).not.toHaveBeenCalled();
    });
  });
});
