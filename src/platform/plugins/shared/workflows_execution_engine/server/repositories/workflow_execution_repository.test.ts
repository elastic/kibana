/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import { WorkflowExecutionRepository } from './workflow_execution_repository';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

describe('WorkflowExecutionRepository', () => {
  let repository: WorkflowExecutionRepository;
  let esClient: {
    index: jest.Mock;
    update: jest.Mock;
    search: jest.Mock;
    indices: { exists: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    esClient = {
      index: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
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
        refresh: true,
        document: workflowExecution,
      });
    });

    it('should throw an error if ID is missing during creation', async () => {
      await expect(repository.createWorkflowExecution({})).rejects.toThrow(
        'Workflow execution ID is required for creation'
      );
    });

    it('should respect space isolation when searching for workflow executions', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow', spaceId: 'space1' };
      await repository.createWorkflowExecution(workflowExecution);
      esClient.search.mockResolvedValueOnce({ hits: { hits: [], total: { value: 0 } } });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            spaceId: 'space1',
          }),
        })
      );

      await repository.getWorkflowExecutionById('1', 'space2');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { spaceId: 'space2' } }]),
            }),
          }),
        })
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
        refresh: true,
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

  describe('getRunningExecutionsByWorkflowId', () => {
    it('should return running executions for a workflow', async () => {
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
        query: {
          bool: {
            must: [{ term: { workflowId: 'workflow-1' } }, { term: { spaceId: 'default' } }],
            must_not: [
              {
                terms: {
                  status: TerminalExecutionStatuses,
                },
              },
            ],
          },
        },
        size: 1,
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
        query: {
          bool: {
            must: [
              { term: { workflowId: 'workflow-1' } },
              { term: { spaceId: 'default' } },
              { term: { triggeredBy: 'scheduled' } },
            ],
            must_not: [
              {
                terms: {
                  status: TerminalExecutionStatuses,
                },
              },
            ],
          },
        },
        size: 1,
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

    it('should exclude terminal statuses', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await repository.getRunningExecutionsByWorkflowId('workflow-1', 'default');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must_not: [
                {
                  terms: {
                    status: TerminalExecutionStatuses,
                  },
                },
              ],
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
              must: expect.arrayContaining([{ term: { spaceId: 'space-1' } }]),
            }),
          }),
        })
      );
    });

    it('should include non-terminal statuses in results', async () => {
      const nonTerminalStatuses = [
        ExecutionStatus.PENDING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING_FOR_INPUT,
        ExecutionStatus.RUNNING,
      ];

      for (const status of nonTerminalStatuses) {
        const mockHits = [
          {
            _source: {
              id: 'exec-1',
              workflowId: 'workflow-1',
              spaceId: 'default',
              status,
            },
          },
        ];
        esClient.search.mockResolvedValue({
          hits: { hits: mockHits, total: { value: 1, relation: 'eq' } },
        });

        const result = await repository.getRunningExecutionsByWorkflowId('workflow-1', 'default');

        expect(result).toEqual(mockHits);
        jest.clearAllMocks();
      }
    });
  });

  describe('getRunningExecutionsByConcurrencyGroup', () => {
    it('should query for non-terminal executions by concurrency group key', async () => {
      const mockExecutions = [
        {
          _source: {
            id: 'exec-1',
            concurrencyGroupKey: 'server-1',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            createdAt: '2024-01-01T00:00:00Z',
          },
        },
        {
          _source: {
            id: 'exec-2',
            concurrencyGroupKey: 'server-1',
            spaceId: 'default',
            status: ExecutionStatus.PENDING,
            createdAt: '2024-01-01T01:00:00Z',
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
            must: [{ term: { concurrencyGroupKey: 'server-1' } }, { term: { spaceId: 'default' } }],
            must_not: [
              {
                terms: {
                  status: TerminalExecutionStatuses,
                },
              },
            ],
          },
        },
        sort: [{ createdAt: { order: 'asc' } }],
        size: 1000,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('exec-1');
      expect(result[1].id).toBe('exec-2');
    });

    it('should exclude specified execution ID from results', async () => {
      const mockExecutions = [
        {
          _source: {
            id: 'exec-2',
            concurrencyGroupKey: 'server-1',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            createdAt: '2024-01-01T01:00:00Z',
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
            must: [{ term: { concurrencyGroupKey: 'server-1' } }, { term: { spaceId: 'default' } }],
            must_not: [
              {
                terms: {
                  status: TerminalExecutionStatuses,
                },
              },
              { term: { id: 'exec-1' } },
            ],
          },
        },
        sort: [{ createdAt: { order: 'asc' } }],
        size: 1000,
      });
    });

    it('should return executions sorted by createdAt ascending (oldest first)', async () => {
      const mockExecutions = [
        {
          _source: {
            id: 'exec-1',
            concurrencyGroupKey: 'server-1',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            createdAt: '2024-01-01T00:00:00Z',
          },
        },
        {
          _source: {
            id: 'exec-2',
            concurrencyGroupKey: 'server-1',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            createdAt: '2024-01-01T01:00:00Z',
          },
        },
        {
          _source: {
            id: 'exec-3',
            concurrencyGroupKey: 'server-1',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            createdAt: '2024-01-01T02:00:00Z',
          },
        },
      ];

      esClient.search.mockResolvedValue({
        hits: { hits: mockExecutions, total: { value: 3, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default');

      // ES returns sorted results, so we expect them in order
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('exec-1');
      expect(result[1].id).toBe('exec-2');
      expect(result[2].id).toBe('exec-3');
    });

    it('should return empty array when no running executions found', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      const result = await repository.getRunningExecutionsByConcurrencyGroup('server-1', 'default');

      expect(result).toHaveLength(0);
    });
  });
});
