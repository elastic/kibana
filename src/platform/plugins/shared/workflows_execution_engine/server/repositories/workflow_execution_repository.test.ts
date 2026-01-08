/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionRepository } from './workflow_execution_repository';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

describe('WorkflowExecutionRepository', () => {
  let repository: WorkflowExecutionRepository;
  let esClient: {
    index: jest.Mock;
    update: jest.Mock;
    search: jest.Mock;
    get: jest.Mock;
    indices: { exists: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    esClient = {
      index: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
      get: jest.fn(),
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    repository = new WorkflowExecutionRepository(esClient as any);
  });

  describe('createWorkflowExecution', () => {
    it('should create a workflow execution', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow', spaceId: 'default' };
      await repository.createWorkflowExecution(workflowExecution);
      expect(esClient.index).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: '1',
        refresh: false,
        document: workflowExecution,
      });
    });

    it('should throw an error if ID is missing during creation', async () => {
      await expect(repository.createWorkflowExecution({})).rejects.toThrow(
        'Workflow execution ID is required for creation'
      );
    });

    it('should respect space isolation when getting workflow execution by ID', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow', spaceId: 'space1' };
      await repository.createWorkflowExecution(workflowExecution);

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            spaceId: 'space1',
          }),
        })
      );

      // Mock get to return a document with different spaceId
      esClient.get.mockResolvedValueOnce({
        _source: { id: '1', workflowId: 'test-workflow', spaceId: 'space1' },
      });

      // Should return null when spaceId doesn't match
      const result = await repository.getWorkflowExecutionById('1', 'space2');

      expect(esClient.get).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: '1',
      });
      expect(result).toBeNull();
    });

    it('should return document when spaceId matches', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow', spaceId: 'space1' };
      esClient.get.mockResolvedValueOnce({
        _source: workflowExecution,
      });

      const result = await repository.getWorkflowExecutionById('1', 'space1');

      expect(esClient.get).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: '1',
      });
      expect(result).toEqual(workflowExecution);
    });

    it('should return null when document is not found', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      esClient.get.mockRejectedValueOnce(notFoundError);

      const result = await repository.getWorkflowExecutionById('non-existent', 'space1');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).meta = { statusCode: 500 };
      esClient.get.mockRejectedValueOnce(serverError);

      await expect(repository.getWorkflowExecutionById('1', 'space1')).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });

  describe('updateWorkflowExecution', () => {
    it('should update a workflow execution', async () => {
      const workflowExecution = { id: '1', status: ExecutionStatus.RUNNING };
      await repository.updateWorkflowExecution(workflowExecution);
      expect(esClient.update).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: '1',
        refresh: false,
        doc: workflowExecution,
      });
    });

    it('should throw an error if ID is missing during update', async () => {
      await expect(repository.updateWorkflowExecution({})).rejects.toThrow(
        'Workflow execution ID is required for update'
      );
    });
  });

  describe('searchWorkflowExecutions', () => {
    it('should search workflow executions with default size', async () => {
      const mockHits = [
        { _source: { id: '1', workflowId: 'workflow-1' } },
        { _source: { id: '2', workflowId: 'workflow-1' } },
      ];
      esClient.search.mockResolvedValue({
        hits: { hits: mockHits, total: { value: 2, relation: 'eq' } },
      });

      const query = { term: { workflowId: 'workflow-1' } };
      const result = await repository.searchWorkflowExecutions(query);

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query,
        size: 10,
      });
      expect(result).toEqual(mockHits);
    });

    it('should search workflow executions with custom size', async () => {
      const mockHits = [{ _source: { id: '1', workflowId: 'workflow-1' } }];
      esClient.search.mockResolvedValue({
        hits: { hits: mockHits, total: { value: 1, relation: 'eq' } },
      });

      const query = { term: { workflowId: 'workflow-1' } };
      const result = await repository.searchWorkflowExecutions(query, 5);

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query,
        size: 5,
      });
      expect(result).toEqual(mockHits);
    });

    it('should handle complex queries', async () => {
      const mockHits: unknown[] = [];
      esClient.search.mockResolvedValue({
        hits: { hits: mockHits, total: { value: 0, relation: 'eq' } },
      });

      const query = {
        bool: {
          must: [{ term: { workflowId: 'workflow-1' } }, { term: { spaceId: 'default' } }],
        },
      };
      const result = await repository.searchWorkflowExecutions(query, 20);

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query,
        size: 20,
      });
      expect(result).toEqual(mockHits);
    });
  });

  describe('hasRunningExecution', () => {
    it('should return true when running execution exists', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 1, relation: 'eq' } },
      });

      const result = await repository.hasRunningExecution('workflow-1', 'default');

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        size: 0,
        terminate_after: 1,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: [
                    ExecutionStatus.PENDING,
                    ExecutionStatus.WAITING,
                    ExecutionStatus.WAITING_FOR_INPUT,
                    ExecutionStatus.RUNNING,
                  ],
                },
              },
            ],
          },
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when no running execution exists', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      const result = await repository.hasRunningExecution('workflow-1', 'default');

      expect(result).toBe(false);
    });

    it('should filter by triggeredBy when provided', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 1, relation: 'eq' } },
      });

      const result = await repository.hasRunningExecution('workflow-1', 'default', 'scheduled');

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        size: 0,
        terminate_after: 1,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: [
                    ExecutionStatus.PENDING,
                    ExecutionStatus.WAITING,
                    ExecutionStatus.WAITING_FOR_INPUT,
                    ExecutionStatus.RUNNING,
                  ],
                },
              },
              { term: { triggeredBy: 'scheduled' } },
            ],
          },
        },
      });
      expect(result).toBe(true);
    });

    it('should handle total as number', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: 5 },
      });

      const result = await repository.hasRunningExecution('workflow-1', 'default');

      expect(result).toBe(true);
    });
  });

  describe('getRunningExecutionsByWorkflowId', () => {
    it('should return running executions for a workflow using optimized query', async () => {
      const mockHits = [
        {
          _source: {
            id: 'exec-1',
            workflowId: 'workflow-1',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
          },
        },
      ];
      esClient.search.mockResolvedValue({
        hits: { hits: mockHits, total: { value: 1, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByWorkflowId('workflow-1', 'default');

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        size: 1,
        terminate_after: 1,
        query: {
          bool: {
            filter: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: [
                    ExecutionStatus.PENDING,
                    ExecutionStatus.WAITING,
                    ExecutionStatus.WAITING_FOR_INPUT,
                    ExecutionStatus.RUNNING,
                  ],
                },
              },
            ],
          },
        },
      });
      expect(result).toEqual(mockHits);
    });

    it('should filter by triggeredBy when provided', async () => {
      const mockHits = [
        {
          _source: {
            id: 'exec-1',
            workflowId: 'workflow-1',
            spaceId: 'default',
            status: ExecutionStatus.PENDING,
            triggeredBy: 'scheduled',
          },
        },
      ];
      esClient.search.mockResolvedValue({
        hits: { hits: mockHits, total: { value: 1, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByWorkflowId(
        'workflow-1',
        'default',
        'scheduled'
      );

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        size: 1,
        terminate_after: 1,
        query: {
          bool: {
            filter: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: [
                    ExecutionStatus.PENDING,
                    ExecutionStatus.WAITING,
                    ExecutionStatus.WAITING_FOR_INPUT,
                    ExecutionStatus.RUNNING,
                  ],
                },
              },
              { term: { triggeredBy: 'scheduled' } },
            ],
          },
        },
      });
      expect(result).toEqual(mockHits);
    });

    it('should return empty array when no running executions exist', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByWorkflowId('workflow-1', 'default');

      expect(result).toEqual([]);
    });

    it('should use filter context for better performance', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await repository.getRunningExecutionsByWorkflowId('workflow-1', 'default');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.any(Array),
            }),
          }),
        })
      );
    });

    it('should respect space isolation', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await repository.getRunningExecutionsByWorkflowId('workflow-1', 'space-1');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { spaceId: 'space-1' } }]),
            }),
          }),
        })
      );
    });
  });
});
