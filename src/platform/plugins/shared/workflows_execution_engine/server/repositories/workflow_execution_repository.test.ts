/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, NonTerminalExecutionStatuses } from '@kbn/workflows';
import { WorkflowExecutionRepository } from './workflow_execution_repository';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

describe('WorkflowExecutionRepository', () => {
  let repository: WorkflowExecutionRepository;
  let esClient: {
    index: jest.Mock;
    update: jest.Mock;
    search: jest.Mock;
    get: jest.Mock;
    bulk: jest.Mock;
    indices: { exists: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    esClient = {
      index: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
      get: jest.fn(),
      bulk: jest.fn(),
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
        _source: false,
        query: {
          bool: {
            filter: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: NonTerminalExecutionStatuses,
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
        _source: false,
        query: {
          bool: {
            filter: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: NonTerminalExecutionStatuses,
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
                  status: NonTerminalExecutionStatuses,
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
                  status: NonTerminalExecutionStatuses,
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

  describe('getRunningExecutionsByConcurrencyGroup', () => {
    it('should query for non-terminal execution IDs by concurrency group key', async () => {
      const mockExecutions = [
        {
          _id: 'exec-1',
          _source: {
            id: 'exec-1',
          },
        },
        {
          _id: 'exec-2',
          _source: {
            id: 'exec-2',
          },
        },
      ];

      esClient.search.mockResolvedValue({
        hits: { hits: mockExecutions, total: { value: 2, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default');

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query: {
          bool: {
            filter: [
              { term: { concurrencyGroupKey: 'server-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: NonTerminalExecutionStatuses,
                },
              },
            ],
          },
        },
        _source: ['id'],
        sort: [{ createdAt: { order: 'asc' } }],
        size: 5000,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('exec-1');
      expect(result[1]).toBe('exec-2');
    });

    it('should exclude specified execution ID from results', async () => {
      const mockExecutions = [
        {
          _id: 'exec-2',
          _source: {
            id: 'exec-2',
          },
        },
      ];

      esClient.search.mockResolvedValue({
        hits: { hits: mockExecutions, total: { value: 1, relation: 'eq' } },
      });

      await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default', 'exec-1');

      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query: {
          bool: {
            filter: [
              { term: { concurrencyGroupKey: 'server-1' } },
              { term: { spaceId: 'default' } },
              {
                terms: {
                  status: NonTerminalExecutionStatuses,
                },
              },
              {
                bool: {
                  must_not: [{ term: { id: 'exec-1' } }],
                },
              },
            ],
          },
        },
        _source: ['id'],
        sort: [{ createdAt: { order: 'asc' } }],
        size: 5000,
      });
    });

    it('should return execution IDs sorted by createdAt ascending (oldest first)', async () => {
      const mockExecutions = [
        {
          _id: 'exec-1',
          _source: {
            id: 'exec-1',
          },
        },
        {
          _id: 'exec-2',
          _source: {
            id: 'exec-2',
          },
        },
        {
          _id: 'exec-3',
          _source: {
            id: 'exec-3',
          },
        },
      ];

      esClient.search.mockResolvedValue({
        hits: { hits: mockExecutions, total: { value: 3, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default');

      // ES returns sorted results, so we expect them in order
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('exec-1');
      expect(result[1]).toBe('exec-2');
      expect(result[2]).toBe('exec-3');
    });

    it('should return empty array when no running executions found', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default');

      expect(result).toHaveLength(0);
    });

    it('should use default size of 5000 when not provided', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 5000,
        })
      );
    });

    it('should respect custom size parameter', async () => {
      const mockExecutions = Array.from({ length: 5 }, (_, i) => ({
        _id: `exec-${i + 1}`,
        _source: { id: `exec-${i + 1}` },
      }));

      esClient.search.mockImplementation((params: any) => {
        const size = params.size || 5000;
        return Promise.resolve({
          hits: {
            hits: mockExecutions.slice(0, size),
            total: { value: mockExecutions.length, relation: 'eq' as const },
          },
        });
      });

      const result = await repository.getRunningExecutionsByConcurrencyGroup(
        'server-1',
        'default',
        undefined,
        3
      );

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 3,
        })
      );
      expect(result).toHaveLength(3);
    });

    it('should cap size at 10000 (ES max_result_window)', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await repository.getRunningExecutionsByConcurrencyGroup(
        'server-1',
        'default',
        undefined,
        15000
      );

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10000, // Capped at ES max_result_window
        })
      );
    });
  });

  describe('bulkUpdateWorkflowExecutions', () => {
    it('should successfully bulk update multiple workflow executions', async () => {
      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { update: { _id: 'exec-1', status: 200 } },
          { update: { _id: 'exec-2', status: 200 } },
        ],
      });

      await repository.bulkUpdateWorkflowExecutions([
        {
          id: 'exec-1',
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
        },
        {
          id: 'exec-2',
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
        },
      ]);

      expect(esClient.bulk).toHaveBeenCalledWith({
        refresh: true,
        index: WORKFLOWS_EXECUTIONS_INDEX,
        body: [
          { update: { _id: 'exec-1' } },
          { doc: { id: 'exec-1', status: ExecutionStatus.CANCELLED, cancelRequested: true } },
          { update: { _id: 'exec-2' } },
          { doc: { id: 'exec-2', status: ExecutionStatus.CANCELLED, cancelRequested: true } },
        ],
      });
    });

    it('should handle empty array without making ES call', async () => {
      await repository.bulkUpdateWorkflowExecutions([]);

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw error if execution ID is missing', async () => {
      await expect(
        repository.bulkUpdateWorkflowExecutions([
          {
            id: '',
            status: ExecutionStatus.CANCELLED,
          },
        ])
      ).rejects.toThrow('Workflow execution ID is required for bulk update');

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw error with details when bulk operation has errors', async () => {
      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { update: { _id: 'exec-1', status: 200 } },
          {
            update: {
              _id: 'exec-2',
              error: { type: 'document_missing_exception', reason: 'document missing' },
              status: 404,
            },
          },
        ],
      });

      await expect(
        repository.bulkUpdateWorkflowExecutions([
          {
            id: 'exec-1',
            status: ExecutionStatus.CANCELLED,
          },
          {
            id: 'exec-2',
            status: ExecutionStatus.CANCELLED,
          },
        ])
      ).rejects.toThrow('Failed to update 1 workflow executions');

      expect(esClient.bulk).toHaveBeenCalled();
    });
  });
});
