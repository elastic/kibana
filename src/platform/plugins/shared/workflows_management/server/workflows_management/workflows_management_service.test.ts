/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, SecurityServiceStart } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { workflowsExecutionEngineMock } from '@kbn/workflows-execution-engine/server/mocks';
import { WorkflowsService } from './workflows_management_service';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockSecurity: jest.Mocked<SecurityServiceStart>;

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
      bulk: jest.fn().mockResolvedValue({ items: [] }),
    } as any;

    mockLogger = loggerMock.create();
    mockLogger.error = jest.fn();

    const mockGetActionsClient = jest.fn().mockResolvedValue({
      getAll: jest.fn().mockResolvedValue([]),
      execute: jest.fn(),
      bulkEnqueueExecution: jest.fn(),
    } as unknown as IUnsecuredActionsClient);
    const mockGetActionsClientWithRequest = jest.fn().mockResolvedValue({
      listTypes: jest.fn().mockResolvedValue([]),
      getAll: jest.fn().mockResolvedValue({ data: [] }),
    } as unknown as PublicMethodsOf<ActionsClient>);

    const getCoreStart = jest.fn().mockResolvedValue({
      ...coreMock.createStart(),
      elasticsearch: {
        client: {
          asInternalUser: mockEsClient,
        },
      },
    });

    const getPluginsStart = jest.fn().mockResolvedValue({
      workflowsExecutionEngine: workflowsExecutionEngineMock.createStart(),
      actions: {
        getUnsecuredActionsClient: mockGetActionsClient,
        getActionsClientWithRequest: mockGetActionsClientWithRequest,
      },
      workflowsExtensions: {
        getAllTriggerDefinitions: jest.fn().mockReturnValue([]),
      },
    });

    service = new WorkflowsService(mockLogger, getCoreStart, getPluginsStart);

    mockSecurity = {
      authc: {
        getCurrentUser: jest.fn((request) => ({ username: request.auth.credentials.username })),
      },
    } as any;

    service.setSecurityService(mockSecurity);

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
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdatedAt: '2023-01-01T00:00:00.000Z',
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

      const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

      expect(result).toEqual({
        page: 1,
        size: 10,
        total: 1,
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
            createdAt: '2023-01-01T00:00:00.000Z',
            lastUpdatedAt: '2023-01-01T00:00:00.000Z',
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

      await service.getWorkflows({ size: 10, page: 1, enabled: [true] }, 'default');

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
              { terms: { enabled: [true] } },
            ],
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
        track_total_hits: true,
      });
    });

    it('should filter by tags', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockSearchResponse as any);

      await service.getWorkflows({ size: 10, page: 1, tags: ['test', 'production'] }, 'default');

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
              { terms: { tags: ['test', 'production'] } },
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

      await service.getWorkflows({ size: 10, page: 1, query: 'test query' }, 'default');

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
                bool: {
                  should: [
                    // Exact phrase matching with boost (text fields only)
                    {
                      multi_match: {
                        query: 'test query',
                        fields: ['name^3', 'description^2'],
                        type: 'phrase',
                        boost: 3,
                      },
                    },
                    // Word-level matching (all fields)
                    {
                      multi_match: {
                        query: 'test query',
                        fields: ['name^2', 'description', 'tags'],
                        type: 'best_fields',
                        boost: 2,
                      },
                    },
                    // Prefix matching for partial word matches (text fields only)
                    {
                      multi_match: {
                        query: 'test query',
                        fields: ['name^2', 'description'],
                        type: 'phrase_prefix',
                        boost: 1.5,
                      },
                    },
                    // Wildcard matching for more flexible partial matches
                    {
                      bool: {
                        should: [
                          {
                            wildcard: {
                              'name.keyword': {
                                value: '*test query*',
                                case_insensitive: true,
                                boost: 1,
                              },
                            },
                          },
                          {
                            wildcard: {
                              'description.keyword': {
                                value: '*test query*',
                                case_insensitive: true,
                                boost: 0.5,
                              },
                            },
                          },
                          {
                            wildcard: {
                              tags: {
                                value: '*test query*',
                                case_insensitive: true,
                                boost: 0.5,
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        sort: [{ updated_at: { order: 'desc' } }],
        track_total_hits: true,
      });
    });

    describe('with execution history', () => {
      const mockExecutionResponse = {
        aggregations: {
          workflows: {
            buckets: [
              {
                key: 'test-workflow-id',
                recent_executions: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          id: 'execution-1',
                          workflowId: 'test-workflow-id',
                          status: 'completed',
                          startedAt: '2023-01-01T10:00:00.000Z',
                          finishedAt: '2023-01-01T10:05:00.000Z',
                          workflowDefinition: { name: 'Test Workflow' },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      it('should include execution history when workflows have executions', async () => {
        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument],
            total: { value: 1 },
          },
        };

        // First call for workflows, second call for execution history
        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockResolvedValueOnce(mockExecutionResponse as any);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results[0].history).toHaveLength(1);
        expect(result.results[0].history[0]).toEqual({
          id: 'execution-1',
          workflowId: 'test-workflow-id',
          workflowName: 'Test Workflow',
          status: 'completed',
          startedAt: '2023-01-01T10:00:00.000Z',
          finishedAt: '2023-01-01T10:05:00.000Z',
          duration: 300000, // 5 minutes in milliseconds
        });

        // Verify execution history query
        expect(mockEsClient.search).toHaveBeenCalledTimes(2);
        expect(mockEsClient.search).toHaveBeenNthCalledWith(2, {
          index: WORKFLOWS_EXECUTIONS_INDEX,
          size: 0,
          query: {
            bool: {
              must: [
                { terms: { workflowId: ['test-workflow-id'] } },
                {
                  bool: {
                    should: [
                      { term: { spaceId: 'default' } },
                      { bool: { must_not: { exists: { field: 'spaceId' } } } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          aggs: {
            workflows: {
              terms: {
                field: 'workflowId',
                size: 1,
              },
              aggs: {
                recent_executions: {
                  top_hits: {
                    size: 1,
                    sort: [{ finishedAt: { order: 'desc' } }],
                  },
                },
              },
            },
          },
        });
      });

      it('should handle workflows without execution history', async () => {
        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument],
            total: { value: 1 },
          },
        };

        const mockEmptyExecutionResponse = {
          aggregations: {
            workflows: {
              buckets: [],
            },
          },
        };

        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockResolvedValueOnce(mockEmptyExecutionResponse as any);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results[0].history).toEqual([]);
      });

      it('should handle execution history with missing finishedAt', async () => {
        const mockExecutionResponseWithoutFinishedAt = {
          aggregations: {
            workflows: {
              buckets: [
                {
                  key: 'test-workflow-id',
                  recent_executions: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            id: 'execution-1',
                            workflowId: 'test-workflow-id',
                            status: 'running',
                            startedAt: '2023-01-01T10:00:00.000Z',
                            finishedAt: null,
                            workflowDefinition: { name: 'Test Workflow' },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument],
            total: { value: 1 },
          },
        };

        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockResolvedValueOnce(mockExecutionResponseWithoutFinishedAt as any);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results[0].history[0]).toEqual({
          id: 'execution-1',
          workflowId: 'test-workflow-id',
          workflowName: 'Test Workflow',
          status: 'running',
          startedAt: '2023-01-01T10:00:00.000Z',
          finishedAt: '2023-01-01T10:00:00.000Z', // Falls back to startedAt
          duration: null,
        });
      });

      it('should handle multiple workflows with mixed execution history', async () => {
        const mockWorkflowDocument2 = {
          _id: 'test-workflow-id-2',
          _source: {
            ...mockWorkflowDocument._source,
            name: 'Test Workflow 2',
          },
        };

        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument, mockWorkflowDocument2],
            total: { value: 2 },
          },
        };

        const mockMixedExecutionResponse = {
          aggregations: {
            workflows: {
              buckets: [
                {
                  key: 'test-workflow-id',
                  recent_executions: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            id: 'execution-1',
                            workflowId: 'test-workflow-id',
                            status: 'completed',
                            startedAt: '2023-01-01T10:00:00.000Z',
                            finishedAt: '2023-01-01T10:05:00.000Z',
                            workflowDefinition: { name: 'Test Workflow' },
                          },
                        },
                      ],
                    },
                  },
                },
                // test-workflow-id-2 has no executions (not in buckets)
              ],
            },
          },
        };

        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockResolvedValueOnce(mockMixedExecutionResponse as any);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results).toHaveLength(2);
        expect(result.results[0].history).toHaveLength(1);
        expect(result.results[1].history).toEqual([]);
      });

      it('should handle execution history fetch errors gracefully', async () => {
        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument],
            total: { value: 1 },
          },
        };

        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockRejectedValueOnce(new Error('Execution search failed'));

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results[0].history).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to fetch recent executions for workflows: Error: Execution search failed'
        );
      });

      it('should not log error when index_not_found_exception occurs (expected behavior)', async () => {
        mockLogger.error.mockClear();
        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument],
            total: { value: 1 },
          },
        };

        const indexNotFoundError = new errors.ResponseError({
          statusCode: 404,
          body: {
            error: {
              type: 'index_not_found_exception',
              reason: 'no such index [.workflows-executions]',
            },
          },
          headers: {},
          meta: {} as any,
          warnings: [],
        });

        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockRejectedValueOnce(indexNotFoundError);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results[0].history).toEqual([]);
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it('should log error when non-index_not_found_exception errors occur', async () => {
        mockLogger.error.mockClear();
        const mockSearchResponse = {
          hits: {
            hits: [mockWorkflowDocument],
            total: { value: 1 },
          },
        };

        const otherError = new errors.ResponseError({
          statusCode: 500,
          body: {
            error: {
              type: 'internal_server_error',
              reason: 'Internal server error',
            },
          },
          headers: {},
          meta: {} as any,
          warnings: [],
        });

        mockEsClient.search
          .mockResolvedValueOnce(mockSearchResponse as any)
          .mockRejectedValueOnce(otherError);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results[0].history).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to fetch recent executions for workflows')
        );
      });

      it('should not fetch execution history for empty workflow list', async () => {
        const mockSearchResponse = {
          hits: {
            hits: [],
            total: { value: 0 },
          },
        };

        mockEsClient.search.mockResolvedValueOnce(mockSearchResponse as any);

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default');

        expect(result.results).toEqual([]);
        expect(mockEsClient.search).toHaveBeenCalledTimes(1); // Only workflows search, no execution search
      });
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow with valid yaml successfully', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const workflowCommand = {
        yaml: `
name: dummy workflow
triggers:
  - type: manual
steps:
  - type: console
    name: first-step
    with:
      message: "Hello, world!"
`,
      };

      mockEsClient.index.mockResolvedValue({ _id: 'new-workflow-id' } as any);

      const result = await service.createWorkflow(workflowCommand, 'default', mockRequest);

      expect(result.name).toBe('dummy workflow');
      expect(result.enabled).toBe(true);
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'dummy workflow',
            enabled: true,
            yaml: workflowCommand.yaml,
            createdBy: 'test-user',
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
          }),
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should create workflow with invalid yaml and set valid to false', async () => {
      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      const workflowCommand = {
        yaml: 'name: invalid workflow\nenabled: true\ntriggers:\n  - type: invalid-trigger-type',
      };

      mockEsClient.index.mockResolvedValue({ _id: 'new-workflow-id' } as any);

      const result = await service.createWorkflow(workflowCommand, 'default', mockRequest);

      expect(result.name).toBe('Untitled workflow');
      expect(result.enabled).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.definition).toBeNull();
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          index: '.workflows-workflows',
        })
      );
    });

    it('should create workflow with custom ID when provided', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const customId = 'workflow-12345678-abcd-1234-abcd-123456789abc';
      const workflowCommand = {
        yaml: `
name: Custom ID Workflow
triggers:
  - type: manual
steps:
  - type: console
    name: first-step
    with:
      message: "Hello, world!"`,
        id: customId,
      };

      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 0 },
          hits: [],
        },
      } as any);
      mockEsClient.index.mockResolvedValue({ _id: customId } as any);

      const result = await service.createWorkflow(workflowCommand, 'default', mockRequest);

      expect(result.id).toBe(customId);
      expect(result.name).toBe('Custom ID Workflow');
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: customId,
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'Custom ID Workflow',
            enabled: true,
            createdBy: 'test-user',
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
          }),
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should create workflow with duplicate step names and set valid to false', async () => {
      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      const workflowCommand = {
        yaml: `name: duplicate step names workflow
enabled: true
triggers:
  - type: manual
steps:
  - type: console
    name: first-step
    with:
      message: "Hello, world!"
  - type: console
    name: first-step
    with:
      message: "Hello, world!"`,
      };

      mockEsClient.index.mockResolvedValue({ _id: 'new-workflow-id' } as any);

      const result = await service.createWorkflow(workflowCommand, 'default', mockRequest);

      expect(result.name).toBe('duplicate step names workflow');
      expect(result.enabled).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.definition).toBeNull();
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          index: '.workflows-workflows',
        })
      );
    });
    it('should throw WorkflowConflictError when custom ID already exists', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const existingId = 'workflow-12345678-1234-1234-1234-123456789abc';
      const workflowCommand = {
        yaml: 'name: Duplicate Workflow\nenabled: true\ndefinition:\n  triggers: []',
        id: existingId,
      };

      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: existingId,
              _source: {
                name: 'Existing Workflow',
                enabled: true,
                spaceId: 'default',
                yaml: 'name: Existing Workflow',
              },
            },
          ],
        },
      } as any);

      await expect(
        service.createWorkflow(workflowCommand, 'default', mockRequest)
      ).rejects.toMatchObject({
        name: 'WorkflowConflictError',
        message: `Workflow with id '${existingId}' already exists`,
        statusCode: 409,
        workflowId: existingId,
      });

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('should throw WorkflowValidationError for invalid ID format', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const invalidId = 'invalid-id-format';
      const workflowCommand = {
        yaml: 'name: Invalid ID Workflow\nenabled: true\ndefinition:\n  triggers: []',
        id: invalidId,
      };

      await expect(
        service.createWorkflow(workflowCommand, 'default', mockRequest)
      ).rejects.toMatchObject({
        name: 'WorkflowValidationError',
        message: `Invalid workflow ID format. Expected format: workflow-{uuid}, received: ${invalidId}`,
        statusCode: 400,
      });

      expect(mockEsClient.index).not.toHaveBeenCalled();
      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('should throw WorkflowValidationError for ID without workflow prefix', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const invalidId = '12345678-1234-1234-1234-123456789abc';
      const workflowCommand = {
        yaml: 'name: Missing Prefix Workflow\nenabled: true\ndefinition:\n  triggers: []',
        id: invalidId,
      };

      await expect(
        service.createWorkflow(workflowCommand, 'default', mockRequest)
      ).rejects.toMatchObject({
        name: 'WorkflowValidationError',
        message: `Invalid workflow ID format. Expected format: workflow-{uuid}, received: ${invalidId}`,
        statusCode: 400,
      });

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('bulkCreateWorkflows', () => {
    const mockRequest = {
      auth: {
        credentials: {
          username: 'test-user',
        },
      },
    } as any;

    it('should bulk create workflows successfully', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { index: { _id: 'workflow-1', status: 201 } },
          { index: { _id: 'workflow-2', status: 201 } },
        ],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: workflow one
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`,
        },
        {
          yaml: `
name: workflow two
triggers:
  - type: manual
steps:
  - type: console
    name: step-two
    with:
      message: "World"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.created[0].name).toBe('workflow one');
      expect(result.created[1].name).toBe('workflow two');
      expect(mockEsClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should handle partial failures in bulk create', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: 'workflow-1', status: 201 } },
          {
            index: {
              _id: 'workflow-2',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'failed to parse' },
            },
          },
        ],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: good workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`,
        },
        {
          yaml: `
name: bad workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-two
    with:
      message: "World"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.created[0].name).toBe('good workflow');
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].error).toContain('failed to parse');
    });

    it('should handle invalid yaml in bulk create without failing entire batch', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'workflow-1', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: valid workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });

    it('should return empty results when given empty array', async () => {
      const result = await service.bulkCreateWorkflows([], 'default', mockRequest);

      expect(result.created).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should reject malformed custom IDs and include them in failed', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'workflow-1', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: valid workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`,
        },
        {
          yaml: `
name: bad id workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-two
    with:
      message: "World"
`,
          id: 'not-a-valid-id',
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].name).toBe('valid workflow');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].error).toContain('Invalid workflow ID format');
    });

    it('should schedule triggers for created workflows with scheduled triggers', async () => {
      const mockTaskScheduler = {
        scheduleWorkflowTask: jest.fn().mockResolvedValue(undefined),
      };
      service.setTaskScheduler(mockTaskScheduler as any);

      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'workflow-1', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: scheduled workflow
triggers:
  - type: 'scheduled'
    with:
      every: '5m'
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`,
        },
      ];

      await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(mockTaskScheduler.scheduleWorkflowTask).toHaveBeenCalled();
    });

    it('should log warning when trigger scheduling fails without affecting result', async () => {
      const mockTaskScheduler = {
        scheduleWorkflowTask: jest.fn().mockRejectedValue(new Error('scheduling failed')),
      };
      service.setTaskScheduler(mockTaskScheduler as any);

      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'workflow-1', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: scheduled workflow
triggers:
  - type: 'scheduled'
    with:
      every: '5m'
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      // Workflow should still be in created despite scheduling failure
      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule trigger')
      );
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const command = {
        yaml: 'name: Updated Workflow\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - type: console\n    name: first-step\n    with:\n      message: "Hello, world!"',
      };

      mockEsClient.search.mockResolvedValue({ hits: { hits: [mockWorkflowDocument] } } as any);

      const result = await service.updateWorkflow(
        'test-workflow-id',
        command,
        'default',
        mockRequest
      );

      expect(result.id).toBe('test-workflow-id');
      expect(result.validationErrors).toEqual([]);
      expect(result.enabled).toBe(true);
      expect(result.valid).toBe(true);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-id',
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'Updated Workflow',
            enabled: true,
            valid: true,
            yaml: command.yaml,
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
          }),
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should throw error when workflow not found', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

      const command = {
        yaml: 'name: Updated Workflow\nenabled: true\ntriggers: []',
      };

      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      await expect(
        service.updateWorkflow('non-existent-id', command, 'default', mockRequest)
      ).rejects.toThrow('Workflow with id non-existent-id not found in space default');
    });

    it('should save yaml not conforming to the schema, but set "enabled" and "valid" to false', async () => {
      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      const command = {
        yaml: 'name: Updated Workflow\nenabled: true\ntriggers:\n  - type: invalid-trigger-type',
      };

      mockEsClient.search.mockResolvedValue({ hits: { hits: [mockWorkflowDocument] } } as any);

      const result = await service.updateWorkflow(
        'test-workflow-id',
        command,
        'default',
        mockRequest
      );

      expect(result.id).toBe('test-workflow-id');
      expect(result.enabled).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid trigger type. Available: manual, alert, scheduled'),
          expect.stringContaining('No steps found. Add at least one step.'),
        ])
      );

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-id',
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'Test Workflow',
            enabled: false,
            valid: false,
            yaml: 'name: Updated Workflow\nenabled: true\ntriggers:\n  - type: invalid-trigger-type',
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
            definition: undefined,
          }),
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should save incomplete yaml, but set "enabled" and "valid" to false', async () => {
      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      const command = {
        yaml: 'name: Updated Workflow',
      };

      mockEsClient.search.mockResolvedValue({ hits: { hits: [mockWorkflowDocument] } } as any);

      const result = await service.updateWorkflow(
        'test-workflow-id',
        command,
        'default',
        mockRequest
      );

      expect(result.id).toBe('test-workflow-id');
      expect(result.enabled).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('No triggers found. Add at least one trigger.'),
          expect.stringContaining('No steps found. Add at least one step.'),
        ])
      );

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-id',
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'Test Workflow',
            enabled: false,
            valid: false,
            yaml: command.yaml,
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
            definition: undefined,
          }),
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should save invalid yaml, but do not update definition fields and update enabled, valid to false', async () => {
      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      const command = {
        yaml: '  name: Test Workflow\nenabled: true\n  triggers:\n  - type: alert',
      };

      mockEsClient.search.mockResolvedValue({ hits: { hits: [mockWorkflowDocument] } } as any);

      const result = await service.updateWorkflow(
        'test-workflow-id',
        command,
        'default',
        mockRequest
      );

      expect(result.id).toBe('test-workflow-id');
      expect(result.enabled).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.validationErrors[0]).toEqual(
        expect.stringContaining('Unexpected scalar at node end at line 2')
      );

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-id',
          index: '.workflows-workflows',
          document: expect.objectContaining({
            name: 'Test Workflow',
            enabled: false,
            valid: false,
            yaml: command.yaml,
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
            definition: undefined,
          }),
          refresh: true,
          require_alias: true,
        })
      );
    });

    it('should preserve YAML comments, formatting, and template expressions when toggling enabled', async () => {
      const mockRequest = {
        auth: {
          credentials: { username: 'test-user' },
        },
      } as any;

      const yamlWithComments = `# Workflow configuration
name: Test Workflow
description: A test workflow

# Whether the workflow is active
enabled: false

triggers:
  - type: manual

steps:
  # Create a Jira ticket
  - type: console
    name: first-step
    with:
      message: "{{ inputs.comment }}"`;

      const existingDoc = {
        _id: 'test-workflow-id',
        _source: {
          ...mockWorkflowDocument._source,
          enabled: false,
          yaml: yamlWithComments,
          definition: {
            name: 'Test Workflow',
            enabled: false,
            triggers: [{ type: 'manual' }],
            steps: [
              {
                type: 'console',
                name: 'first-step',
                with: { message: '{{ inputs.comment }}' },
              },
            ],
          },
        },
      };

      mockEsClient.search.mockResolvedValue({ hits: { hits: [existingDoc] } } as any);

      // Toggle enabled without providing yaml (metadata-only update)
      await service.updateWorkflow('test-workflow-id', { enabled: true }, 'default', mockRequest);

      const indexCall = mockEsClient.index.mock.calls[0][0] as any;
      const savedYaml = indexCall.document.yaml;

      // enabled should be toggled
      expect(savedYaml).toContain('enabled: true');
      expect(savedYaml).not.toContain('enabled: false');

      // Comments should be preserved
      expect(savedYaml).toContain('# Workflow configuration');
      expect(savedYaml).toContain('# Whether the workflow is active');
      expect(savedYaml).toContain('# Create a Jira ticket');

      // Template expressions should not be corrupted
      expect(savedYaml).toContain('{{ inputs.comment }}');
      expect(savedYaml).not.toContain('null');

      // Blank lines should be preserved
      expect((savedYaml.match(/\n\n/g) || []).length).toBeGreaterThanOrEqual(2);
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
      mockEsClient.bulk.mockResolvedValue({
        items: [
          {
            index: {
              _id: 'test-workflow-id',
              status: 200,
            },
          },
        ],
      } as any);

      const result = await service.deleteWorkflows(['test-workflow-id'], 'default');

      expect(result).toEqual({
        total: 1,
        deleted: 1,
        failures: [],
      });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ ids: { values: ['test-workflow-id'] } }, { term: { spaceId: 'default' } }],
            },
          },
          size: 1,
        })
      );
      // Verify bulk was called with correct structure
      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      expect(bulkCall.index).toBe('.workflows-workflows');
      expect(bulkCall.operations).toBeDefined();
      expect(bulkCall.operations).toHaveLength(2); // metadata + document
      expect(bulkCall.operations![0]).toEqual({ index: { _id: 'test-workflow-id' } });
      expect(bulkCall.operations![1]).toMatchObject({
        enabled: false,
        deleted_at: expect.any(Date),
      });
    });

    it('should handle not found workflows gracefully', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      } as any);

      const result = await service.deleteWorkflows(['non-existent-id'], 'default');

      expect(result).toEqual({
        total: 1,
        deleted: 1,
        failures: [],
      });
    });

    it('should handle partial failures when deleting multiple workflows', async () => {
      const mockWorkflowDocument2 = {
        _id: 'workflow-2',
        _source: {
          ...mockWorkflowDocument._source,
          name: 'Test Workflow 2',
        },
      };

      // Mock search to return both workflows
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [{ ...mockWorkflowDocument, _id: 'workflow-1' }, mockWorkflowDocument2],
          total: { value: 2 },
        },
      } as any);

      // Mock bulk operation where one succeeds and one fails
      mockEsClient.bulk.mockResolvedValue({
        items: [
          {
            index: {
              _id: 'workflow-1',
              status: 200,
            },
          },
          {
            index: {
              _id: 'workflow-2',
              status: 500,
              error: {
                reason: 'Database error',
              },
            },
          },
        ],
      } as any);

      const result = await service.deleteWorkflows(['workflow-1', 'workflow-2'], 'default');

      expect(result).toEqual({
        total: 2,
        deleted: 1,
        failures: [{ id: 'workflow-2', error: 'Database error' }],
      });
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow statistics', async () => {
      const mockWorkflowStatsResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
        aggregations: {
          enabled_count: { doc_count: 7 },
          disabled_count: { doc_count: 3 },
        },
      };

      const mockExecutionStatsResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
        aggregations: {
          daily_stats: { buckets: [] },
        },
      };

      // Mock both search calls - first for workflows, then for executions
      mockEsClient.search
        .mockResolvedValueOnce(mockWorkflowStatsResponse as any)
        .mockResolvedValueOnce(mockExecutionStatsResponse as any);

      const result = await service.getWorkflowStats('default');

      expect(result).toEqual({
        workflows: {
          enabled: 7,
          disabled: 3,
        },
        executions: [],
      });

      // Verify the workflow stats call
      expect(mockEsClient.search).toHaveBeenNthCalledWith(1, {
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
          enabled_count: {
            filter: { term: { enabled: true } },
          },
          disabled_count: {
            filter: { term: { enabled: false } },
          },
        },
        track_total_hits: true,
      });

      // Verify the execution stats call
      expect(mockEsClient.search).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          size: 0,
        })
      );
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

  describe('getWorkflowExecutions', () => {
    it('should return workflow executions with proper filtering', async () => {
      const mockExecutionsResponse = {
        hits: {
          hits: [
            {
              _id: 'execution-1',
              _source: {
                spaceId: 'default',
                status: 'completed',
                startedAt: '2023-01-01T00:00:00Z',
                error: { type: 'SomeError', message: 'An error occurred' },
                finishedAt: '2023-01-01T00:05:00Z',
                duration: 300000,
                workflowId: 'workflow-1',
                triggeredBy: 'manual',
              },
            },
          ],
          total: { value: 1 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockExecutionsResponse as any);

      const result = await service.getWorkflowExecutions(
        {
          workflowId: 'workflow-1',
        },
        'default'
      );

      expect(result).toEqual({
        results: [
          {
            spaceId: 'default',
            id: 'execution-1',
            stepId: undefined,
            status: 'completed',
            isTestRun: false,
            startedAt: '2023-01-01T00:00:00Z',
            finishedAt: '2023-01-01T00:05:00Z',
            error: { type: 'SomeError', message: 'An error occurred' },
            duration: 300000,
            workflowId: 'workflow-1',
            triggeredBy: 'manual',
          },
        ],
        size: 100,
        page: 1,
        total: 1,
      });

      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: expect.arrayContaining([
              { term: { workflowId: 'workflow-1' } },
              {
                bool: {
                  should: [
                    { term: { spaceId: 'default' } },
                    // Backward compatibility for objects without spaceId
                    { bool: { must_not: { exists: { field: 'spaceId' } } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ]),
          },
        },
        size: 100,
        from: 0,
        sort: [{ createdAt: 'desc' }],
        track_total_hits: true,
      });
    });

    it('should return workflow executions with status filter', async () => {
      const mockExecutionsResponse = {
        hits: {
          hits: [
            {
              _id: 'execution-1',
              _source: {
                spaceId: 'default',
                status: 'completed',
                startedAt: '2023-01-01T00:00:00Z',
                finishedAt: '2023-01-01T00:05:00Z',
                duration: 300000,
                workflowId: 'workflow-1',
                triggeredBy: 'manual',
              },
            },
          ],
          total: { value: 1 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockExecutionsResponse as any);

      await service.getWorkflowExecutions(
        {
          workflowId: 'workflow-1',
          statuses: [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED],
        },
        'default'
      );

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                {
                  terms: {
                    status: [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED],
                  },
                },
              ]),
            }),
          }),
        })
      );
    });

    describe('execution type filter', () => {
      const mockExecutionsResponse = {
        hits: {
          hits: [
            {
              _id: 'execution-1',
              _source: {
                spaceId: 'default',
                status: 'completed',
                startedAt: '2023-01-01T00:00:00Z',
                finishedAt: '2023-01-01T00:05:00Z',
                duration: 300000,
                workflowId: 'workflow-1',
                triggeredBy: 'manual',
              },
            },
          ],
          total: { value: 1 },
        },
      };
      it('should add filter excluding test runs when filter is production', async () => {
        mockEsClient.search.mockResolvedValue(mockExecutionsResponse as any);

        await service.getWorkflowExecutions(
          {
            workflowId: 'workflow-1',
            executionTypes: [ExecutionType.PRODUCTION],
          },
          'default'
        );

        expect(mockEsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.arrayContaining([
                  {
                    bool: {
                      should: [
                        { term: { isTestRun: false } },
                        { bool: { must_not: { exists: { field: 'isTestRun' } } } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ]),
              }),
            }),
          })
        );
      });

      it('should add filter excluding production runs when filter is test', async () => {
        mockEsClient.search.mockResolvedValue(mockExecutionsResponse as any);

        await service.getWorkflowExecutions(
          {
            workflowId: 'workflow-1',
            executionTypes: [ExecutionType.TEST],
          },
          'default'
        );

        expect(mockEsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.arrayContaining([
                  {
                    term: {
                      isTestRun: true,
                    },
                  },
                ]),
              }),
            }),
          })
        );
      });

      it('should not add test/production run related filters if no execution type is specified', async () => {
        mockEsClient.search.mockResolvedValue(mockExecutionsResponse as any);

        await service.getWorkflowExecutions(
          {
            workflowId: 'workflow-1',
            executionTypes: [],
          },
          'default'
        );

        expect(mockEsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.not.arrayContaining([
                  {
                    term: {
                      isTestRun: true,
                    },
                  },
                ]),
              }),
            }),
          })
        );
        expect(mockEsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.not.arrayContaining([
                  {
                    bool: {
                      should: [
                        { term: { isTestRun: false } },
                        { bool: { must_not: { exists: { field: 'isTestRun' } } } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ]),
              }),
            }),
          })
        );
      });
    });

    it('should handle empty results', async () => {
      const mockEmptyResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockEmptyResponse as any);

      const result = await service.getWorkflowExecutions(
        {
          workflowId: 'workflow-1',
        },
        'default'
      );

      expect(result).toEqual({
        results: [],
        size: 100,
        page: 1,
        total: 0,
      });
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockEsClient.search.mockRejectedValue(error);

      await expect(
        service.getWorkflowExecutions(
          {
            workflowId: 'workflow-1',
          },
          'default'
        )
      ).rejects.toThrow('Search failed');
    });
  });

  describe('getStepExecution', () => {
    it('should return step execution when found', async () => {
      const stepExecution = {
        id: 'step-execution-1',
        stepId: 'first-step',
        workflowRunId: 'execution-1',
        workflowId: 'workflow-1',
        spaceId: 'default',
        status: 'completed',
        startedAt: '2023-01-01T00:00:00.000Z',
        completedAt: '2023-01-01T00:00:01.000Z',
      };

      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: stepExecution, _index: 'workflows-steps', _id: 'step-execution-1' }],
          total: { value: 1 },
        },
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as any);

      const result = await service.getStepExecution(
        { executionId: 'execution-1', id: 'first-step' },
        'default'
      );

      expect(result).toEqual(stepExecution);
      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: [
              { term: { workflowRunId: 'execution-1' } },
              { term: { id: 'first-step' } },
              { term: { spaceId: 'default' } },
            ],
          },
        },
        size: 1,
        track_total_hits: false,
      });
    });

    it('should return null when step execution not found', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [],
          total: { value: 0 },
        },
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as any);

      const result = await service.getStepExecution(
        { executionId: 'execution-1', id: 'first-step' },
        'default'
      );

      expect(result).toBeNull();
    });
  });

  describe('getWorkflowExecution', () => {
    it('should return workflow execution with steps', async () => {
      // Mock the get call for execution (using direct GET by ID)
      const mockExecutionGetResponse = {
        _id: 'execution-1',
        _source: {
          spaceId: 'default',
          status: 'completed',
          startedAt: '2023-01-01T00:00:00Z',
          finishedAt: '2023-01-01T00:05:00Z',
          duration: 300000,
          workflowId: 'workflow-1',
          triggeredBy: 'manual',
          definition: { steps: [] },
        },
      };

      const mockStepExecutionsResponse = {
        hits: {
          hits: [
            {
              _id: 'step-1',
              _source: {
                spaceId: 'default',
                executionId: 'execution-1',
                stepName: 'first-step',
                status: 'completed',
                startedAt: '2023-01-01T00:00:00Z',
                finishedAt: '2023-01-01T00:01:00Z',
              },
            },
          ],
          total: { value: 1 },
        },
      };

      // Mock get for execution and search for step executions
      mockEsClient.get.mockResolvedValueOnce(mockExecutionGetResponse as any);
      mockEsClient.search.mockResolvedValueOnce(mockStepExecutionsResponse as any);

      const result = await service.getWorkflowExecution('execution-1', 'default');

      expect(result).toBeDefined();
      expect(result!.id).toBe('execution-1');
      expect(result!.status).toBe('completed');

      // Verify the execution get call (now uses GET instead of search)
      expect(mockEsClient.get).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: 'execution-1',
      });

      // Verify the step executions search call
      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: [{ match: { workflowRunId: 'execution-1' } }, { term: { spaceId: 'default' } }],
          },
        },
        sort: 'startedAt:desc',
        from: 0,
        size: 1000,
      });
    });

    it('should return null when execution not found (404)', async () => {
      // Mock 404 error for document not found
      const notFoundError = new Error('Not Found') as Error & { meta?: { statusCode?: number } };
      notFoundError.meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValueOnce(notFoundError);

      const result = await service.getWorkflowExecution('non-existent', 'default');

      expect(result).toBeNull();
    });

    it('should return null when spaceId does not match', async () => {
      // Mock execution with different spaceId
      const mockExecutionGetResponse = {
        _id: 'execution-1',
        _source: {
          spaceId: 'different-space',
          status: 'completed',
        },
      };

      mockEsClient.get.mockResolvedValueOnce(mockExecutionGetResponse as any);

      const result = await service.getWorkflowExecution('execution-1', 'default');

      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      const error = new Error('Get failed');
      mockEsClient.get.mockRejectedValue(error);

      await expect(service.getWorkflowExecution('execution-1', 'default')).rejects.toThrow(
        'Get failed'
      );
    });
  });

  describe('getAvailableConnectors', () => {
    let mockActionsClient: jest.Mocked<IUnsecuredActionsClient>;
    let mockActionsClientWithRequest: jest.Mocked<PublicMethodsOf<ActionsClient>>;
    let mockRequest: any;

    beforeEach(async () => {
      mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      };

      mockActionsClient = {
        getAll: jest.fn(),
        execute: jest.fn(),
        bulkEnqueueExecution: jest.fn(),
      } as any;

      mockActionsClientWithRequest = {
        listTypes: jest.fn(),
        getAll: jest.fn(),
      } as any;

      // Update the mocks to return our specific instances
      const mockGetActionsClient = jest.fn().mockResolvedValue(mockActionsClient);
      const mockGetActionsClientWithRequest = jest
        .fn()
        .mockResolvedValue(mockActionsClientWithRequest);

      // Re-initialize service with new mocks
      const getCoreStart = jest.fn().mockResolvedValue({
        ...coreMock.createStart(),
        elasticsearch: {
          client: {
            asInternalUser: mockEsClient,
          },
        },
      });
      const getPluginsStart = jest.fn().mockResolvedValue({
        workflowsExecutionEngine: workflowsExecutionEngineMock.createStart(),
        actions: {
          getUnsecuredActionsClient: mockGetActionsClient,
          getActionsClientWithRequest: mockGetActionsClientWithRequest,
        },
        workflowsExtensions: {
          getAllTriggerDefinitions: jest.fn().mockReturnValue([]),
        },
      });

      service = new WorkflowsService(mockLogger, getCoreStart, getPluginsStart);
      service.setSecurityService(mockSecurity);

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('should return connectors grouped by type with instances', async () => {
      const mockActionTypes = [
        {
          id: '.slack',
          name: 'Slack',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
        {
          id: '.email',
          name: 'Email',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const mockConnectors = [
        {
          id: 'connector-1',
          name: 'My Slack Connector',
          actionTypeId: '.slack',
          isPreconfigured: false,
          isDeprecated: false,
        },
        {
          id: 'connector-2',
          name: 'My Email Connector',
          actionTypeId: '.email',
          isPreconfigured: false,
          isDeprecated: false,
        },
      ];

      mockActionsClient.getAll.mockResolvedValue(mockConnectors as any);
      mockActionsClientWithRequest.listTypes.mockResolvedValue(mockActionTypes as any);

      const result = await service.getAvailableConnectors('default', mockRequest);

      expect(result.totalConnectors).toBe(2);
      expect(result.connectorsByType['.slack']).toBeDefined();
      expect(result.connectorsByType['.email']).toBeDefined();

      expect(result.connectorsByType['.slack']).toEqual({
        actionTypeId: '.slack',
        displayName: 'Slack',
        instances: [
          {
            id: 'connector-1',
            name: 'My Slack Connector',
            isPreconfigured: false,
            isDeprecated: false,
          },
        ],
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
      });

      expect(result.connectorsByType['.email']).toEqual({
        actionTypeId: '.email',
        displayName: 'Email',
        instances: [
          {
            id: 'connector-2',
            name: 'My Email Connector',
            isPreconfigured: false,
            isDeprecated: false,
          },
        ],
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
      });

      expect(mockActionsClient.getAll).toHaveBeenCalledWith('default');
      expect(mockActionsClientWithRequest.listTypes).toHaveBeenCalledWith({
        featureId: expect.any(String),
        includeSystemActionTypes: false,
      });
    });

    it('should include action types without connectors', async () => {
      const mockActionTypes = [
        {
          id: '.slack',
          name: 'Slack',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
        {
          id: '.email',
          name: 'Email',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const mockConnectors = [
        {
          id: 'connector-1',
          name: 'My Slack Connector',
          actionTypeId: '.slack',
          isPreconfigured: false,
          isDeprecated: false,
        },
      ];

      mockActionsClient.getAll.mockResolvedValue(mockConnectors as any);
      mockActionsClientWithRequest.listTypes.mockResolvedValue(mockActionTypes as any);

      const result = await service.getAvailableConnectors('default', mockRequest);

      expect(result.totalConnectors).toBe(1);
      expect(result.connectorsByType['.slack']).toBeDefined();
      expect(result.connectorsByType['.email']).toBeDefined();

      // Slack has an instance
      expect(result.connectorsByType['.slack'].instances).toHaveLength(1);

      // Email has no instances but still appears
      expect(result.connectorsByType['.email'].instances).toHaveLength(0);
      expect(result.connectorsByType['.email'].actionTypeId).toBe('.email');
      expect(result.connectorsByType['.email'].displayName).toBe('Email');
    });

    it('should handle multiple connectors of the same type', async () => {
      const mockActionTypes = [
        {
          id: '.slack',
          name: 'Slack',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const mockConnectors = [
        {
          id: 'connector-1',
          name: 'Slack Connector 1',
          actionTypeId: '.slack',
          isPreconfigured: false,
          isDeprecated: false,
        },
        {
          id: 'connector-2',
          name: 'Slack Connector 2',
          actionTypeId: '.slack',
          isPreconfigured: true,
          isDeprecated: false,
        },
        {
          id: 'connector-3',
          name: 'Slack Connector 3',
          actionTypeId: '.slack',
          isPreconfigured: false,
          isDeprecated: true,
        },
      ];

      mockActionsClient.getAll.mockResolvedValue(mockConnectors as any);
      mockActionsClientWithRequest.listTypes.mockResolvedValue(mockActionTypes as any);

      const result = await service.getAvailableConnectors('default', mockRequest);

      expect(result.totalConnectors).toBe(3);
      expect(result.connectorsByType['.slack'].instances).toHaveLength(3);
      expect(result.connectorsByType['.slack'].instances).toEqual([
        {
          id: 'connector-1',
          name: 'Slack Connector 1',
          isPreconfigured: false,
          isDeprecated: false,
        },
        {
          id: 'connector-2',
          name: 'Slack Connector 2',
          isPreconfigured: true,
          isDeprecated: false,
        },
        {
          id: 'connector-3',
          name: 'Slack Connector 3',
          isPreconfigured: false,
          isDeprecated: true,
        },
      ]);
    });

    it('should handle empty connectors and action types', async () => {
      mockActionsClient.getAll.mockResolvedValue([]);
      mockActionsClientWithRequest.listTypes.mockResolvedValue([]);

      const result = await service.getAvailableConnectors('default', mockRequest);

      expect(result.totalConnectors).toBe(0);
      expect(result.connectorsByType).toEqual({});
    });

    it('should handle connectors with action types not in the list', async () => {
      const mockActionTypes = [
        {
          id: '.slack',
          name: 'Slack',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const mockConnectors = [
        {
          id: 'connector-1',
          name: 'My Slack Connector',
          actionTypeId: '.slack',
          isPreconfigured: false,
          isDeprecated: false,
        },
        {
          id: 'connector-2',
          name: 'Unknown Connector',
          actionTypeId: '.unknown',
          isPreconfigured: false,
          isDeprecated: false,
        },
      ];

      mockActionsClient.getAll.mockResolvedValue(mockConnectors as any);
      mockActionsClientWithRequest.listTypes.mockResolvedValue(mockActionTypes as any);

      const result = await service.getAvailableConnectors('default', mockRequest);

      expect(result.totalConnectors).toBe(2);
      // Only .slack should be in connectorsByType since .unknown is not in actionTypes
      expect(result.connectorsByType['.slack']).toBeDefined();
      expect(result.connectorsByType['.unknown']).toBeUndefined();
      // The .slack connector should still be included
      expect(result.connectorsByType['.slack'].instances).toHaveLength(1);
    });

    it('should call both getAll and listTypes in parallel', async () => {
      const mockActionTypes = [
        {
          id: '.slack',
          name: 'Slack',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const mockConnectors: any[] = [];

      mockActionsClient.getAll.mockResolvedValue(mockConnectors);
      mockActionsClientWithRequest.listTypes.mockResolvedValue(mockActionTypes as any);

      await service.getAvailableConnectors('default', mockRequest);

      // Verify both methods were called
      expect(mockActionsClient.getAll).toHaveBeenCalled();
      expect(mockActionsClientWithRequest.listTypes).toHaveBeenCalled();

      // Verify they were called with correct parameters
      expect(mockActionsClient.getAll).toHaveBeenCalledWith('default');
      expect(mockActionsClientWithRequest.listTypes).toHaveBeenCalledWith({
        featureId: expect.any(String),
        includeSystemActionTypes: false,
      });
    });
  });
});
