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
                  status: [
                    ExecutionStatus.COMPLETED,
                    ExecutionStatus.FAILED,
                    ExecutionStatus.CANCELLED,
                    ExecutionStatus.SKIPPED,
                    ExecutionStatus.TIMED_OUT,
                  ],
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
                  status: [
                    ExecutionStatus.COMPLETED,
                    ExecutionStatus.FAILED,
                    ExecutionStatus.CANCELLED,
                    ExecutionStatus.SKIPPED,
                    ExecutionStatus.TIMED_OUT,
                  ],
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
                    status: [
                      ExecutionStatus.COMPLETED,
                      ExecutionStatus.FAILED,
                      ExecutionStatus.CANCELLED,
                      ExecutionStatus.SKIPPED,
                      ExecutionStatus.TIMED_OUT,
                    ],
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
});
