/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionRepository } from './workflow_execution_repository';
import type { WorkflowExecutionDataStreamClient } from './data_stream';

describe('WorkflowExecutionRepository', () => {
  let repository: WorkflowExecutionRepository;
  let mockDataStreamClient: jest.Mocked<WorkflowExecutionDataStreamClient>;

  beforeEach(() => {
    mockDataStreamClient = {
      search: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<WorkflowExecutionDataStreamClient>;

    repository = new WorkflowExecutionRepository(mockDataStreamClient);
  });

  describe('createWorkflowExecution', () => {
    it('should create a workflow execution via data stream client', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow', spaceId: 'default' };
      await repository.createWorkflowExecution(workflowExecution);
      expect(mockDataStreamClient.create).toHaveBeenCalledWith({
        documents: [workflowExecution],
      });
    });

    it('should throw an error if ID is missing during creation', async () => {
      await expect(repository.createWorkflowExecution({})).rejects.toThrow(
        'Workflow execution ID is required for creation'
      );
    });
  });

  describe('getWorkflowExecutionById', () => {
    it('should return document when found and spaceId matches', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow', spaceId: 'space1' };
      mockDataStreamClient.search.mockResolvedValue({
        hits: {
          hits: [{ _source: workflowExecution }],
        },
      } as any);

      const result = await repository.getWorkflowExecutionById('1', 'space1');

      expect(mockDataStreamClient.search).toHaveBeenCalledWith({
        query: {
          bool: {
            filter: [{ term: { id: '1' } }, { term: { spaceId: 'space1' } }],
          },
        },
        size: 1,
      });
      expect(result).toEqual(workflowExecution);
    });

    it('should return null when document is not found', async () => {
      mockDataStreamClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      const result = await repository.getWorkflowExecutionById('non-existent', 'space1');
      expect(result).toBeNull();
    });
  });
});
