/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, SecurityServiceStart } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { WorkflowsService } from './workflows_management_service';

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
              { terms: { enabled: [true] } },
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

        const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

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
          index: 'workflows-executions',
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

        const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

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

        const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

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

        const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

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

        const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

        expect(result.results[0].history).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to fetch recent executions for workflows: Error: Execution search failed'
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

        const result = await service.getWorkflows({ limit: 10, page: 1 }, 'default');

        expect(result.results).toEqual([]);
        expect(mockEsClient.search).toHaveBeenCalledTimes(1); // Only workflows search, no execution search
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
            createdBy: 'test-user',
            lastUpdatedBy: 'test-user',
            spaceId: 'default',
          }),
          refresh: 'wait_for',
          require_alias: true,
        })
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
          refresh: 'wait_for',
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
          refresh: 'wait_for',
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
          refresh: 'wait_for',
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
              must: [{ ids: { values: ['test-workflow-id'] } }, { term: { spaceId: 'default' } }],
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
            deleted_at: expect.any(Date),
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
          index: 'workflows-executions',
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
            status: 'completed',
            startedAt: '2023-01-01T00:00:00Z',
            finishedAt: '2023-01-01T00:05:00Z',
            duration: 300000,
            workflowId: 'workflow-1',
            triggeredBy: 'manual',
          },
        ],
        _pagination: {
          limit: 1,
          page: 1,
          total: 1,
        },
      });

      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: 'workflows-executions',
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
        sort: [{ createdAt: 'desc' }],
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

    it('should return workflow executions with execution type filter', async () => {
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
          executionTypes: [ExecutionType.PRODUCTION, ExecutionType.TEST],
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
                    executionType: [ExecutionType.PRODUCTION, ExecutionType.TEST],
                  },
                },
              ]),
            }),
          }),
        })
      );
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
        _pagination: {
          limit: 0,
          page: 1,
          total: 0,
        },
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
        index: 'workflows-steps',
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
      const mockExecutionResponse = {
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
                definition: { steps: [] },
              },
            },
          ],
          total: { value: 1 },
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

      // Mock both search calls - first for execution, then for step executions
      mockEsClient.search
        .mockResolvedValueOnce(mockExecutionResponse as any)
        .mockResolvedValueOnce(mockStepExecutionsResponse as any);

      const result = await service.getWorkflowExecution('execution-1', 'default');

      expect(result).toBeDefined();
      expect(result!.id).toBe('execution-1');
      expect(result!.status).toBe('completed');

      // Verify the execution search call
      expect(mockEsClient.search).toHaveBeenNthCalledWith(1, {
        index: 'workflows-executions',
        query: {
          bool: {
            must: [{ ids: { values: ['execution-1'] } }, { term: { spaceId: 'default' } }],
          },
        },
      });

      // Verify the step executions search call
      expect(mockEsClient.search).toHaveBeenNthCalledWith(2, {
        index: 'workflows-steps',
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

    it('should return null when execution not found', async () => {
      const mockEmptyResponse = {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockEmptyResponse as any);

      const result = await service.getWorkflowExecution('non-existent', 'default');

      expect(result).toBeNull();
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockEsClient.search.mockRejectedValue(error);

      await expect(service.getWorkflowExecution('execution-1', 'default')).rejects.toThrow(
        'Search failed'
      );
    });
  });
});
