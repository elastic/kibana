/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import { WorkflowsService } from './workflows_management_service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockTaskScheduler: jest.Mocked<WorkflowTaskScheduler>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  const mockWorkflowDocument = {
    _id: 'test-workflow-id',
    _source: {
      name: 'Test Workflow',
      description: 'A test workflow',
      enabled: true,
      tags: ['test'],
      yaml: 'name: Test Workflow\nenabled: true',
      definition: { name: 'Test Workflow', enabled: true },
      createdBy: 'test-user',
      lastUpdatedBy: 'test-user',
      spaceId: 'default',
      deleted_at: null,
      valid: true,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
  };

  beforeEach(async () => {
    mockEsClient = {
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockResolvedValue({}),
        putMapping: jest.fn().mockResolvedValue({}),
        getIndexTemplate: jest.fn().mockRejectedValue(
          new errors.ResponseError({
            statusCode: 404,
            body: {},
            headers: {},
            meta: {} as any,
            warnings: [],
          })
        ),
        putIndexTemplate: jest.fn().mockResolvedValue({}),
        getAlias: jest.fn().mockRejectedValue(
          new errors.ResponseError({
            statusCode: 404,
            body: {},
            headers: {},
            meta: {} as any,
            warnings: [],
          })
        ),
        putAlias: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({}),
        simulateIndexTemplate: jest.fn().mockResolvedValue({
          template: { mappings: {} },
        }),
      },
      search: jest.fn().mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {},
      }),
      get: jest.fn(),
      index: jest.fn().mockResolvedValue({ _id: 'test-id' }),
      update: jest.fn().mockResolvedValue({ _id: 'test-id' }),
      delete: jest.fn().mockResolvedValue({ _id: 'test-id' }),
    } as any;

    mockTaskScheduler = {
      unscheduleWorkflowTasks: jest.fn(),
    } as any;

    mockLogger = loggerMock.create();
    mockLogger.error = jest.fn();

    const mockEsClientPromise = Promise.resolve(mockEsClient);

    service = new WorkflowsService(
      mockEsClientPromise,
      mockLogger,
      'workflows-executions',
      'workflows-steps',
      'workflows-logs',
      false
    );

    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe('getWorkflow', () => {
    it('should return workflow when found', async () => {
      // Mock the storage adapter search method which is used by get
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [mockWorkflowDocument],
          total: { value: 1 },
        },
      } as any);

      const result = await service.getWorkflow('test-workflow-id', 'default');

      expect(result).toEqual({
        id: 'test-workflow-id',
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        yaml: 'name: Test Workflow\nenabled: true',
        definition: { name: 'Test Workflow', enabled: true },
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        lastUpdatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });

      // The storage adapter uses search internally, not get directly
    });

    it('should return null when workflow not found', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      } as any);

      const result = await service.getWorkflow('non-existent-id', 'default');

      expect(result).toBeNull();
    });

    it('should throw error for other ES errors', async () => {
      mockEsClient.search.mockRejectedValue({ statusCode: 500, message: 'Server error' });

      await expect(service.getWorkflow('test-id', 'default')).rejects.toMatchObject({
        statusCode: 500,
        message: 'Server error',
      });
    });
  });

  describe('getWorkflows', () => {
    it('should return workflows list with pagination', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [mockWorkflowDocument],
          total: { value: 1 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockSearchResponse as any);

      const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

      expect(result).toEqual({
        _pagination: {
          page: 1,
          limit: 10,
          total: 1,
        },
        results: [
          {
            id: 'test-workflow-id',
            name: 'Test Workflow',
            description: 'A test workflow',
            enabled: true,
            yaml: 'name: Test Workflow\nenabled: true',
            definition: { name: 'Test Workflow', enabled: true },
            createdBy: 'test-user',
            lastUpdatedBy: 'test-user',
            valid: true,
            createdAt: new Date('2023-01-01T00:00:00.000Z'),
            lastUpdatedAt: new Date('2023-01-01T00:00:00.000Z'),
            history: [],
          },
        ],
      });

      expect(mockEsClient.search).toHaveBeenCalledWith({
        size: 10,
        from: 0,
        index: '.workflows-workflows',
        allow_no_indices: true,
        query: {
          bool: {
            must: [
              { term: { spaceId: 'default' } },
              {
                bool: {
                  must_not: {
                    exists: { field: 'deleted_at' },
                  },
                },
              },
            ],
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
        track_total_hits: true,
      });
    });

    it('should filter by enabled status', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockSearchResponse as any);

      await service.getWorkflows({ limit: 10, page: 1, enabled: [true] }, 'default');

      expect(mockEsClient.search).toHaveBeenCalledWith({
        size: 10,
        from: 0,
        index: '.workflows-workflows',
        allow_no_indices: true,
        query: {
          bool: {
            must: [
              { term: { spaceId: 'default' } },
              {
                bool: {
                  must_not: {
                    exists: { field: 'deleted_at' },
                  },
                },
              },
              { term: { enabled: [true] } },
            ],
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
        track_total_hits: true,
      });
    });

    it('should filter by query text', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockSearchResponse as any);

      await service.getWorkflows({ limit: 10, page: 1, query: 'test query' }, 'default');

      expect(mockEsClient.search).toHaveBeenCalledWith({
        size: 10,
        from: 0,
        index: '.workflows-workflows',
        allow_no_indices: true,
        query: {
          bool: {
            must: [
              { term: { spaceId: 'default' } },
              {
                bool: {
                  must_not: {
                    exists: { field: 'deleted_at' },
                  },
                },
              },
              {
                multi_match: {
                  query: 'test query',
                  fields: ['name^2', 'description', 'tags'],
                  type: 'best_fields',
                },
              },
            ],
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
        track_total_hits: true,
      });
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow successfully', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const workflowCommand = {
        yaml: 'name: New Workflow\nenabled: true\ndefinition:\n  triggers: []',
      };

      mockEsClient.index.mockResolvedValue({ _id: 'new-workflow-id' } as any);

      const result = await service.createWorkflow(workflowCommand, 'default', mockRequest);

      expect(result.name).toBe('New Workflow');
      expect(result.enabled).toBe(true);
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'New Workflow',
            enabled: true,
            yaml: 'name: New Workflow\nenabled: true\ndefinition:\n  triggers: []',
            createdBy: 'system',
            lastUpdatedBy: 'system',
            spaceId: 'default',
          }),
          refresh: 'wait_for',
          require_alias: true,
        })
      );
    });
  });

  describe('deleteWorkflows', () => {
    it('should soft delete workflows', async () => {
      // Mock search to return the workflow to delete
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [mockWorkflowDocument],
          total: { value: 1 },
        },
      } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'test-workflow-id' } as any);

      await service.deleteWorkflows(['test-workflow-id'], 'default');

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.workflows-workflows',
          allow_no_indices: true,
          query: {
            bool: {
              must: [{ term: { _id: 'test-workflow-id' } }, { term: { spaceId: 'default' } }],
            },
          },
          size: 1,
        })
      );
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-id',
          index: '.workflows-workflows',
          document: expect.objectContaining({
            enabled: false,
            deleted_at: expect.any(String),
          }),
          refresh: 'wait_for',
          require_alias: true,
        })
      );
    });

    it('should handle not found workflows gracefully', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      } as any);

      await expect(service.deleteWorkflows(['non-existent-id'], 'default')).resolves.not.toThrow();
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow statistics', async () => {
      const mockStatsResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
        aggregations: {
          total_count: { value: 10 },
          enabled_count: { doc_count: 7 },
          disabled_count: { doc_count: 3 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockStatsResponse as any);

      const result = await service.getWorkflowStats('default');

      expect(result).toEqual({
        workflows: {
          enabled: 7,
          disabled: 3,
        },
        executions: [],
      });

      expect(mockEsClient.search).toHaveBeenCalledWith({
        size: 0,
        index: '.workflows-workflows',
        allow_no_indices: true,
        query: {
          bool: {
            must: [{ term: { spaceId: 'default' } }],
            must_not: {
              exists: { field: 'deleted_at' },
            },
          },
        },
        aggs: {
          total_count: { value_count: { field: '_id' } },
          enabled_count: {
            filter: { term: { enabled: true } },
          },
          disabled_count: {
            filter: { term: { enabled: false } },
          },
        },
        track_total_hits: true,
      });
    });
  });

  describe('getWorkflowAggs', () => {
    it('should return workflow aggregations', async () => {
      const mockAggsResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
        aggregations: {
          tags: {
            buckets: [
              { key: 'test', doc_count: 5 },
              { key: 'prod', doc_count: 3 },
            ],
          },
        },
      };

      mockEsClient.search.mockResolvedValue(mockAggsResponse as any);

      const result = await service.getWorkflowAggs(['tags'], 'default');

      expect(result).toEqual({
        tags: [
          { key: 'test', doc_count: 5 },
          { key: 'prod', doc_count: 3 },
        ],
      });

      expect(mockEsClient.search).toHaveBeenCalledWith({
        size: 0,
        index: '.workflows-workflows',
        allow_no_indices: true,
        query: {
          bool: {
            must: [{ term: { spaceId: 'default' } }],
            must_not: {
              exists: { field: 'deleted_at' },
            },
          },
        },
        aggs: {
          tags: {
            terms: {
              field: 'tags',
              size: 100,
            },
          },
        },
        track_total_hits: true,
      });
    });
  });
});
