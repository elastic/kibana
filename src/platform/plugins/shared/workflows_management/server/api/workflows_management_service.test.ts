/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Facade tests for WorkflowsService.
 *
 * This file intentionally does NOT re-test behaviour that lives in sub-services.
 * Behavioural coverage belongs in:
 *   - services/workflow_crud_service.test.ts
 *   - services/workflow_execution_query_service.test.ts
 *   - api/lib/*.test.ts and task_defs/*.test.ts (library-function specs)
 *
 * The facade owns exactly two concerns:
 *   1. initPromise sequencing — every public method awaits init before delegating.
 *   2. error propagation from sub-services.
 */

import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { workflowsExecutionEngineMock } from '@kbn/workflows-execution-engine/server/mocks';

import { WorkflowsService } from './workflows_management_service';
import { readWorkflowVersioningEnabled } from '../lib/is_workflow_versioning_enabled';
import { WorkflowChangeHistoryService } from '../services/workflow_change_history_service';
import { WorkflowCrudService } from '../services/workflow_crud_service';
import { WorkflowExecutionQueryService } from '../services/workflow_execution_query_service';
import { WorkflowSearchService } from '../services/workflow_search_service';
import { WorkflowValidationService } from '../services/workflow_validation_service';
import type { WorkflowsServerPluginStartDeps } from '../types';

jest.mock('../services/workflow_change_history_service');
jest.mock('../lib/is_workflow_versioning_enabled', () => ({
  readWorkflowVersioningEnabled: jest.fn().mockResolvedValue(true),
}));

const MockedWorkflowChangeHistoryService = WorkflowChangeHistoryService as jest.MockedClass<
  typeof WorkflowChangeHistoryService
>;
const mockedReadWorkflowVersioningEnabled = readWorkflowVersioningEnabled as jest.MockedFunction<
  typeof readWorkflowVersioningEnabled
>;

type PrototypeSpies = Record<string, jest.SpyInstance>;

const spyPrototype = <T extends object>(
  klass: { prototype: T },
  methods: ReadonlyArray<keyof T & string>
): PrototypeSpies => {
  const spies: PrototypeSpies = {};
  const prototype = klass.prototype as unknown as Record<string, jest.Mock>;
  for (const method of methods) {
    spies[method] = jest
      .spyOn(prototype, method)
      .mockResolvedValue({ facadeTest: method } as never);
  }
  return spies;
};

const makeEsClient = (): jest.Mocked<ElasticsearchClient> =>
  ({
    indices: {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
      putMapping: jest.fn(),
      getIndexTemplate: jest.fn().mockResolvedValue({}),
      putIndexTemplate: jest.fn(),
      getAlias: jest.fn().mockResolvedValue({}),
      putAlias: jest.fn(),
      get: jest.fn().mockResolvedValue({}),
      simulateIndexTemplate: jest.fn().mockResolvedValue({ template: { mappings: {} } }),
    },
    search: jest.fn(),
    index: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
    deleteByQuery: jest.fn(),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const makePluginsStart = (): WorkflowsServerPluginStartDeps =>
  ({
    workflowsExecutionEngine: workflowsExecutionEngineMock.createStart(),
    taskManager: {
      schedule: jest.fn(),
      ensureScheduled: jest.fn(),
      fetch: jest.fn().mockResolvedValue({ docs: [] }),
      remove: jest.fn().mockResolvedValue(undefined),
    },
    actions: {
      getUnsecuredActionsClient: jest.fn().mockReturnValue({}),
      getActionsClientWithRequest: jest.fn().mockResolvedValue({}),
    },
    workflowsExtensions: {
      getAllTriggerDefinitions: jest.fn().mockReturnValue([]),
    },
  } as unknown as WorkflowsServerPluginStartDeps);

const makeCoreStart = (esClient: ElasticsearchClient): CoreStart =>
  ({
    ...coreMock.createStart(),
    elasticsearch: { client: { asInternalUser: esClient } },
  } as unknown as CoreStart);

describe('WorkflowsService (facade)', () => {
  let crudSpies: PrototypeSpies;
  let searchSpies: PrototypeSpies;
  let executionQuerySpies: PrototypeSpies;
  let validationSpies: PrototypeSpies;

  const buildService = async (): Promise<WorkflowsService> => {
    const coreStart = makeCoreStart(makeEsClient());
    const startServices = jest.fn().mockResolvedValue([coreStart, makePluginsStart()]);
    const service = new WorkflowsService(startServices as any, loggerMock.create(), '9.0.0');
    // Wait a tick so initialize() completes.
    await Promise.resolve();
    await Promise.resolve();
    return service;
  };

  beforeEach(() => {
    mockedReadWorkflowVersioningEnabled.mockResolvedValue(true);
    MockedWorkflowChangeHistoryService.mockImplementation(
      () =>
        ({
          initialize: jest.fn().mockResolvedValue(undefined),
          isInitialized: jest.fn().mockReturnValue(true),
        } as unknown as WorkflowChangeHistoryService)
    );
    crudSpies = spyPrototype(WorkflowCrudService, [
      'getWorkflow',
      'getWorkflowsByIds',
      'getWorkflowsSourceByIds',
      'createWorkflow',
      'bulkCreateWorkflows',
      'updateWorkflow',
      'deleteWorkflows',
      'disableAllWorkflows',
    ]);
    searchSpies = spyPrototype(WorkflowSearchService, [
      'getWorkflowsSubscribedToTrigger',
      'getWorkflows',
      'getWorkflowStats',
      'getWorkflowAggs',
    ]);
    executionQuerySpies = spyPrototype(WorkflowExecutionQueryService, [
      'getWorkflowExecution',
      'getChildWorkflowExecutions',
      'getWorkflowExecutions',
      'getWorkflowExecutionHistory',
      'getStepExecutions',
      'searchStepExecutions',
      'getExecutionLogs',
      'getStepLogs',
      'getStepExecution',
    ]);
    validationSpies = spyPrototype(WorkflowValidationService, [
      'getAvailableConnectors',
      'validateWorkflow',
      'getWorkflowZodSchema',
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes change history when workflow versioning uiSetting is enabled', async () => {
      mockedReadWorkflowVersioningEnabled.mockResolvedValue(true);

      const changeHistoryInstance = {
        initialize: jest.fn().mockResolvedValue(undefined),
        isInitialized: jest.fn().mockReturnValue(true),
      };
      MockedWorkflowChangeHistoryService.mockImplementation(
        () => changeHistoryInstance as unknown as WorkflowChangeHistoryService
      );

      const esClient = makeEsClient();
      const coreStart = makeCoreStart(esClient);
      const service = await (async () => {
        const startServices = jest.fn().mockResolvedValue([coreStart, makePluginsStart()]);
        const svc = new WorkflowsService(startServices as any, loggerMock.create(), '9.0.0');
        await Promise.resolve();
        await Promise.resolve();
        return svc;
      })();

      await service.getWorkflow('wf-1', 'default');

      expect(mockedReadWorkflowVersioningEnabled).toHaveBeenCalledWith(coreStart);
      expect(changeHistoryInstance.initialize).toHaveBeenCalledWith({
        elasticsearchClient: esClient,
        authService: coreStart.security!.authc,
      });
    });

    it('skips change history init when workflow versioning uiSetting is disabled', async () => {
      mockedReadWorkflowVersioningEnabled.mockResolvedValue(false);

      const changeHistoryInstance = {
        initialize: jest.fn().mockResolvedValue(undefined),
        isInitialized: jest.fn().mockReturnValue(false),
      };
      MockedWorkflowChangeHistoryService.mockImplementation(
        () => changeHistoryInstance as unknown as WorkflowChangeHistoryService
      );

      const esClient = makeEsClient();
      const coreStart = makeCoreStart(esClient);
      const service = await (async () => {
        const startServices = jest.fn().mockResolvedValue([coreStart, makePluginsStart()]);
        const svc = new WorkflowsService(startServices as any, loggerMock.create(), '9.0.0');
        await Promise.resolve();
        await Promise.resolve();
        return svc;
      })();

      await service.getWorkflow('wf-1', 'default');

      expect(mockedReadWorkflowVersioningEnabled).toHaveBeenCalledWith(coreStart);
      expect(changeHistoryInstance.initialize).not.toHaveBeenCalled();
    });

    it('awaits initPromise before delegating to a sub-service', async () => {
      let releaseStartServices: (value: [CoreStart, WorkflowsServerPluginStartDeps]) => void = () =>
        undefined;
      const startServicesPromise = new Promise<[CoreStart, WorkflowsServerPluginStartDeps]>(
        (resolve) => {
          releaseStartServices = resolve;
        }
      );

      const startServices = jest.fn().mockReturnValue(startServicesPromise);
      const service = new WorkflowsService(startServices as any, loggerMock.create(), '9.0.0');

      const call = service.getWorkflow('wf-1', 'default');
      // Give the microtask queue a chance to run — the call must still be pending.
      await Promise.resolve();
      expect(crudSpies.getWorkflow).not.toHaveBeenCalled();

      releaseStartServices([makeCoreStart(makeEsClient()), makePluginsStart()]);

      await call;
      expect(crudSpies.getWorkflow).toHaveBeenCalledTimes(1);
    });
  });

<<<<<<< HEAD
  describe('delegation', () => {
    it('delegates CRUD reads and writes to WorkflowCrudService', async () => {
      const service = await buildService();
      const request = {} as any;

      await service.getWorkflow('wf-1', 'default', { includeDeleted: true });
      await service.getWorkflowsByIds(['a', 'b'], 'default', { includeDeleted: true });
      await service.getWorkflowsSourceByIds(['a'], 'default', ['name'], { includeDeleted: false });
      await service.createWorkflow({ name: 'n' } as any, 'default', request);
      await service.bulkCreateWorkflows([{ name: 'n' } as any], 'default', request, {
=======
  describe('getWorkflowsSubscribedToTrigger', () => {
    it('should return enabled workflows in space that have the trigger type', async () => {
      const workflowWithTrigger = {
        _id: 'workflow-with-trigger',
        _source: {
          ...mockWorkflowDocument._source,
          triggerTypes: ['manual', 'cases.updated'],
          name: 'Case workflow',
        },
      };
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [workflowWithTrigger], total: { value: 1 } },
        pit_id: 'pit-123',
      } as any);

      const result = await service.getWorkflowsSubscribedToTrigger('cases.updated', 'default');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'workflow-with-trigger',
        name: 'Case workflow',
        enabled: true,
      });
      expect(mockEsClient.openPointInTime).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.stringContaining('workflows'),
          keep_alive: '1m',
        })
      );
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          pit: { id: 'pit-123', keep_alive: '1m' },
          query: {
            bool: {
              must: [
                { term: { spaceId: 'default' } },
                { term: { enabled: true } },
                { term: { triggerTypes: 'cases.updated' } },
              ],
              must_not: [{ exists: { field: 'deleted_at' } }],
            },
          },
          size: 1000,
          sort: [{ updated_at: { order: 'desc' } }, '_shard_doc'],
        })
      );
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-123' });
    });

    it('should return empty array when no workflows are subscribed', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        pit_id: 'pit-123',
      } as any);

      const result = await service.getWorkflowsSubscribedToTrigger('unknown.trigger', 'default');

      expect(result).toEqual([]);
      expect(mockEsClient.openPointInTime).toHaveBeenCalled();
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-123' });
    });

    it('should page with search_after when results exceed page size', async () => {
      // sort is [updated_at, _shard_doc]; _shard_doc is a numeric tie-breaker (we use index for mock)
      const createHit = (id: string, updatedAt: string, shardDoc: number) => ({
        _id: id,
        _source: {
          ...mockWorkflowDocument._source,
          triggerTypes: ['cases.updated'],
          updated_at: updatedAt,
        },
        sort: [updatedAt, shardDoc],
      });
      const page1Hits = Array.from({ length: 1000 }, (_, i) =>
        createHit(`wf-${i}`, '2025-01-02T00:00:00.000Z', i)
      );
      const page2Hits = [createHit('wf-1000', '2025-01-01T00:00:00.000Z', 1000)];

      mockEsClient.search
        .mockResolvedValueOnce({
          hits: { hits: page1Hits, total: { value: 1001 } },
          pit_id: 'pit-123',
        } as any)
        .mockResolvedValueOnce({
          hits: { hits: page2Hits, total: { value: 1001 } },
          pit_id: 'pit-123',
        } as any);

      const result = await service.getWorkflowsSubscribedToTrigger('cases.updated', 'default');

      expect(result).toHaveLength(1001);
      expect(mockEsClient.search).toHaveBeenCalledTimes(2);
      expect(mockEsClient.search).toHaveBeenNthCalledWith(
        1,
        expect.not.objectContaining({ search_after: expect.anything() })
      );
      expect(mockEsClient.search).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          search_after: ['2025-01-02T00:00:00.000Z', 999],
        })
      );
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-123' });
    });

    it('should return results and log warning when closePointInTime throws in finally', async () => {
      const workflowWithTrigger = {
        _id: 'workflow-with-trigger',
        _source: {
          ...mockWorkflowDocument._source,
          triggerTypes: ['manual', 'cases.updated'],
          name: 'Case workflow',
        },
      };
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [workflowWithTrigger], total: { value: 1 } },
        pit_id: 'pit-123',
      } as any);
      mockEsClient.closePointInTime.mockRejectedValue(new Error('PIT already closed'));

      const result = await service.getWorkflowsSubscribedToTrigger('cases.updated', 'default');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'workflow-with-trigger',
        name: 'Case workflow',
        enabled: true,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to close PIT pit-123:.*PIT already closed/)
      );
    });

    it('should stop at MAX_PAGES and log warning when result set exceeds cap', async () => {
      const createHit = (id: string, updatedAt: string, shardDoc: number) => ({
        _id: id,
        _source: {
          ...mockWorkflowDocument._source,
          triggerTypes: ['cases.updated'],
          updated_at: updatedAt,
        },
        sort: [updatedAt, shardDoc],
      });
      const fullPageHits = Array.from({ length: 1000 }, (_, i) =>
        createHit(`wf-${i}`, '2025-01-02T00:00:00.000Z', i)
      );
      // Return full pages so hasMore stays true; after MAX_PAGES (50) we stop
      mockEsClient.search.mockResolvedValue({
        hits: { hits: fullPageHits, total: { value: 150000 } },
        pit_id: 'pit-123',
      } as any);

      const result = await service.getWorkflowsSubscribedToTrigger('cases.updated', 'default');

      expect(mockEsClient.search).toHaveBeenCalledTimes(50);
      expect(result).toHaveLength(50000);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /getWorkflowsSubscribedToTrigger truncated at 50 pages \(50000 workflows\) for trigger cases\.updated in space default/
        )
      );
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

      it('should not include execution history when includeExecutionHistory is false', async () => {
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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: false,
        });

        expect(result.results[0].history).toEqual(undefined);

        // First call for workflows, second call for execution history
        expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      });

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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

        expect(result.results[0].history).toHaveLength(1);
        expect(result.results[0].history?.[0]).toEqual({
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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

        expect(result.results[0].history?.[0]).toEqual({
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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

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

        const result = await service.getWorkflows({ size: 10, page: 1 }, 'default', {
          includeExecutionHistory: true,
        });

        expect(result.results).toEqual([]);
        expect(mockEsClient.search).toHaveBeenCalledTimes(1); // Only workflows search, no execution search
      });
    });
  });

  describe('getWorkflowsByIds', () => {
    it('should return workflows matching the given IDs and spaceId', async () => {
      const doc1 = {
        _id: 'w-1',
        _source: { ...mockWorkflowDocument._source, name: 'Workflow One' },
      };
      const doc2 = {
        _id: 'w-2',
        _source: { ...mockWorkflowDocument._source, name: 'Workflow Two' },
      };

      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [doc1, doc2], total: { value: 2 } },
      } as any);

      const result = await service.getWorkflowsByIds(['w-1', 'w-2'], 'default');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('w-1');
      expect(result[1].id).toBe('w-2');

      const searchCall = mockEsClient.search.mock.calls[0][0] as Record<string, unknown>;
      const query = searchCall.query as { bool: { must: unknown[]; must_not: unknown[] } };
      expect(query.bool.must).toEqual(
        expect.arrayContaining([
          { ids: { values: ['w-1', 'w-2'] } },
          { term: { spaceId: 'default' } },
        ])
      );
      expect(query.bool.must_not).toEqual([{ exists: { field: 'deleted_at' } }]);
    });

    it('should return empty array when given no IDs', async () => {
      const result = await service.getWorkflowsByIds([], 'default');

      expect(result).toEqual([]);
      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('should return only found workflows when some IDs are missing', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'w-1', _source: { ...mockWorkflowDocument._source, name: 'Found' } }],
          total: { value: 1 },
        },
      } as any);

      const result = await service.getWorkflowsByIds(['w-1', 'w-missing'], 'default');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('w-1');
    });
  });

  describe('getWorkflowsSourceByIds', () => {
    it('should return matching workflows for existing IDs', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'w-1', _source: { name: 'Existing One' } }],
        },
      } as any);

      const result = await service.getWorkflowsSourceByIds(['w-1', 'w-new'], 'my-space', ['name']);

      expect(result).toEqual([expect.objectContaining({ id: 'w-1', name: 'Existing One' })]);

      const searchCall = mockEsClient.search.mock.calls[0][0] as Record<string, unknown>;
      const query = searchCall.query as { bool: { must: unknown[]; must_not: unknown[] } };
      expect(query.bool.must).toEqual(
        expect.arrayContaining([
          { ids: { values: ['w-1', 'w-new'] } },
          { term: { spaceId: 'my-space' } },
        ])
      );
      expect(query.bool.must_not).toEqual([{ exists: { field: 'deleted_at' } }]);
      expect(searchCall._source).toEqual(['name']);
    });

    it('should default _source to true when source parameter is omitted', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'w-1', _source: { name: 'Workflow' } }],
        },
      } as any);

      await service.getWorkflowsSourceByIds(['w-1'], 'default');

      const searchCall = mockEsClient.search.mock.calls[0][0] as Record<string, unknown>;
      expect(searchCall._source).toBe(true);
    });

    it('should return empty array when no IDs exist', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as any);

      const result = await service.getWorkflowsSourceByIds(['w-1'], 'default', ['name']);

      expect(result).toEqual([]);
    });

    it('should return empty array when given no IDs', async () => {
      const result = await service.getWorkflowsSourceByIds([], 'default');

      expect(result).toEqual([]);
      expect(mockEsClient.search).not.toHaveBeenCalled();
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

    it('should throw WorkflowValidationError for ID with uppercase characters', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const invalidId = 'Invalid-ID-Format';
      const workflowCommand = {
        yaml: 'name: Invalid ID Workflow\nenabled: true\ndefinition:\n  triggers: []',
        id: invalidId,
      };

      await expect(
        service.createWorkflow(workflowCommand, 'default', mockRequest)
      ).rejects.toMatchObject({
        name: 'WorkflowValidationError',
        statusCode: 400,
      });

      expect(mockEsClient.index).not.toHaveBeenCalled();
      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('should throw WorkflowValidationError for ID with special characters', async () => {
      const mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      const invalidId = 'workflow@invalid.id';
      const workflowCommand = {
        yaml: 'name: Special Chars Workflow\nenabled: true\ndefinition:\n  triggers: []',
        id: invalidId,
      };

      await expect(
        service.createWorkflow(workflowCommand, 'default', mockRequest)
      ).rejects.toMatchObject({
        name: 'WorkflowValidationError',
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
          { create: { _id: 'workflow-1', status: 201 } },
          { create: { _id: 'workflow-2', status: 201 } },
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
          refresh: 'wait_for',
          require_alias: true,
        })
      );
    });

    it('should handle partial failures in bulk create', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { create: { _id: 'workflow-1', status: 201 } },
          {
            create: {
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
        items: [{ create: { _id: 'workflow-1', status: 201 } }],
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
        items: [{ create: { _id: 'workflow-1', status: 201 } }],
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
          id: 'NOT_A_VALID.ID',
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
        items: [{ create: { _id: 'workflow-1', status: 201 } }],
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
        items: [{ create: { _id: 'workflow-1', status: 201 } }],
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

    it('should use index operation when overwrite is true', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'workflow-1', status: 200 } }],
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
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest, {
>>>>>>> 9.4
        overwrite: true,
      });
      await service.updateWorkflow('wf-1', { name: 'new' } as any, 'default', request);
      await service.deleteWorkflows(['wf-1'], 'default', { force: true });
      await service.disableAllWorkflows('my-space');

<<<<<<< HEAD
      expect(crudSpies.getWorkflow).toHaveBeenCalledWith('wf-1', 'default', {
        includeDeleted: true,
      });
      expect(crudSpies.getWorkflowsByIds).toHaveBeenCalledWith(['a', 'b'], 'default', {
        includeDeleted: true,
      });
      expect(crudSpies.getWorkflowsSourceByIds).toHaveBeenCalledWith(['a'], 'default', ['name'], {
        includeDeleted: false,
      });
      expect(crudSpies.createWorkflow).toHaveBeenCalledWith({ name: 'n' }, 'default', request);
      expect(crudSpies.bulkCreateWorkflows).toHaveBeenCalledWith(
        [{ name: 'n' }],
=======
      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(0);

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const firstOp = bulkCall.operations?.[0];
      expect(firstOp).toHaveProperty('index');
      expect(firstOp).not.toHaveProperty('create');
    });

    it('should use create operation by default (no overwrite)', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ create: { _id: 'workflow-1', status: 201 } }],
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
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(0);

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const firstOp = bulkCall.operations?.[0];
      expect(firstOp).toHaveProperty('create');
      expect(firstOp).not.toHaveProperty('index');
    });

    it('should fail user-supplied IDs that already exist when overwrite is false', async () => {
      // Mock checkExistingIds search to return 'my-custom-id' as existing
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'my-custom-id',
              _source: { name: 'Existing', spaceId: 'default', yaml: '', valid: true },
            },
          ],
          total: { value: 1 },
        },
      } as any);

      const workflows = [
        {
          id: 'my-custom-id',
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
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('my-custom-id');
      expect(result.failed[0].error).toContain('already exists');
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should allow user-supplied IDs that already exist when overwrite is true', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'my-custom-id', status: 200 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          id: 'my-custom-id',
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
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest, {
        overwrite: true,
      });

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      // Should NOT have called search for conflict check when overwrite is true
      // (only the resolveUniqueWorkflowIds search is expected for server-gen IDs,
      // but this workflow has a custom ID so no server-gen resolution needed)
    });

    it('should resolve server-generated ID collisions against database', async () => {
      // Mock resolveUniqueWorkflowIds search to return 'workflow-one' as existing
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'workflow-one',
              _source: { name: 'Existing', spaceId: 'default', yaml: '', valid: true },
            },
          ],
          total: { value: 1 },
        },
      } as any);

      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ create: { _id: 'workflow-one-1', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          yaml: `
name: Workflow One
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

      const bulkCall = mockEsClient.bulk.mock.calls[0][0] as {
        operations: Array<{ create: { _id: string } }>;
      };
      const id = bulkCall.operations
        .filter((op): op is { create: { _id: string } } => 'create' in op)
        .map((op) => op.create._id);

      // Should have resolved to workflow-one-1 since workflow-one already exists
      expect(id[0]).toBe('workflow-one-1');
    });

    it('should resolve server-generated IDs against both database and in-batch', async () => {
      // Mock: 'duplicate-name' already exists in the database
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'duplicate-name',
              _source: { name: 'Existing', spaceId: 'default', yaml: '', valid: true },
            },
          ],
          total: { value: 1 },
        },
      } as any);

      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { create: { _id: 'duplicate-name-1', status: 201 } },
          { create: { _id: 'duplicate-name-2', status: 201 } },
        ],
        took: 10,
      } as any);

      const yaml = `
name: Duplicate Name
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`;

      const result = await service.bulkCreateWorkflows(
        [{ yaml }, { yaml }],
        'default',
        mockRequest
      );

      const bulkCall = mockEsClient.bulk.mock.calls[0][0] as {
        operations: Array<{ create: { _id: string } }>;
      };
      const ids = bulkCall.operations
        .filter((op): op is { create: { _id: string } } => 'create' in op)
        .map((op) => op.create._id);

      // 'duplicate-name' taken in DB, so first gets -1, second gets -2
      expect(ids[0]).toBe('duplicate-name-1');
      expect(ids[1]).toBe('duplicate-name-2');

      expect(result.created).toHaveLength(2);
    });

    it('should fail duplicate user-supplied IDs within the same batch', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ create: { _id: 'same-id', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          id: 'same-id',
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
          id: 'same-id',
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

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Duplicate workflow id');
    });

    it('should keep the first workflow when user-supplied IDs are duplicated in a batch', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ create: { _id: 'same-id', status: 201 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          id: 'same-id',
          yaml: `
name: first workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "I am first"
`,
        },
        {
          id: 'same-id',
          yaml: `
name: second workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-two
    with:
      message: "I am second"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].name).toBe('first workflow');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].error).toContain('Duplicate workflow id');
    });

    it('should route server-generated IDs around user-supplied IDs in the same batch', async () => {
      // resolveUniqueWorkflowIds: no candidates exist in DB
      mockEsClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { create: { _id: 'my-workflow', status: 201 } },
          { create: { _id: 'my-workflow-1', status: 201 } },
        ],
        took: 10,
      } as any);

      const workflows = [
        {
          id: 'my-workflow',
          yaml: `
name: custom id workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Custom"
`,
        },
        {
          yaml: `
name: My Workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-two
    with:
      message: "Server gen"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(2);

      const bulkCall = mockEsClient.bulk.mock.calls[0][0] as {
        operations: Array<{ create: { _id: string } }>;
      };
      const ids = bulkCall.operations
        .filter((op): op is { create: { _id: string } } => 'create' in op)
        .map((op) => op.create._id);

      expect(ids[0]).toBe('my-workflow');
      expect(ids[1]).toBe('my-workflow-1');
    });

    it('should fail duplicate user-supplied IDs even when overwrite is true', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'same-id', status: 200 } }],
        took: 10,
      } as any);

      const workflows = [
        {
          id: 'same-id',
          yaml: `
name: first
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "a"
`,
        },
        {
          id: 'same-id',
          yaml: `
name: second
triggers:
  - type: manual
steps:
  - type: console
    name: step-two
    with:
      message: "b"
`,
        },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest, {
        overwrite: true,
      });

      expect(result.created).toHaveLength(1);
      expect(result.created[0].name).toBe('first');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].error).toContain('Duplicate workflow id');
    });

    it('should keep only the first of three user-supplied duplicates', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ create: { _id: 'triple', status: 201 } }],
        took: 10,
      } as any);

      const yaml = `
name: triple workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`;

      const workflows = [
        { id: 'triple', yaml },
        { id: 'triple', yaml },
        { id: 'triple', yaml },
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[1].index).toBe(2);
      expect(result.failed[0].error).toContain('Duplicate workflow id');
      expect(result.failed[1].error).toContain('Duplicate workflow id');
    });

    it('should handle create operation version_conflict_engine_exception gracefully', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          {
            create: {
              _id: 'workflow-one',
              status: 409,
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'document already exists',
              },
            },
          },
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
      ];

      const result = await service.bulkCreateWorkflows(workflows, 'default', mockRequest);

      expect(result.created).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('document already exists');
    });

    it('should block user-supplied ID that matches a soft-deleted workflow', async () => {
      // checkExistingIds intentionally includes soft-deleted workflows
      // (no deleted_at filter) so their IDs cannot be reassigned.
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'soft-deleted-id',
              _source: {
                name: 'Deleted',
                spaceId: 'default',
                yaml: '',
                valid: true,
                deleted_at: '2024-01-01T00:00:00.000Z',
              },
            },
          ],
          total: { value: 1 },
        },
      } as any);

      const workflows = [
        {
          id: 'soft-deleted-id',
          yaml: `
name: reuse attempt
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

      expect(result.created).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('soft-deleted-id');
      expect(result.failed[0].error).toContain('already exists');
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
>>>>>>> 9.4
        'default',
        request,
        { overwrite: true }
      );
      expect(crudSpies.updateWorkflow).toHaveBeenCalledWith(
        'wf-1',
        { name: 'new' },
        'default',
        request
      );
      expect(crudSpies.deleteWorkflows).toHaveBeenCalledWith(['wf-1'], 'default', { force: true });
      expect(crudSpies.disableAllWorkflows).toHaveBeenCalledWith('my-space');
    });

    it('delegates search-side reads to WorkflowSearchService', async () => {
      const service = await buildService();

      await service.getWorkflowsSubscribedToTrigger('trig-1', 'default');
      await service.getWorkflows({ page: 1, size: 10 } as any, 'default', {
        includeExecutionHistory: true,
      });
      await service.getWorkflowStats('default', { includeExecutionStats: true });
      await service.getWorkflowAggs(['name'], 'default');
      await service.getWorkflowAggs(['tags'], 'default', { managedFilter: 'all' });

      expect(searchSpies.getWorkflowsSubscribedToTrigger).toHaveBeenCalledWith('trig-1', 'default');
      expect(searchSpies.getWorkflows).toHaveBeenCalledWith({ page: 1, size: 10 }, 'default', {
        includeExecutionHistory: true,
      });
      expect(searchSpies.getWorkflowStats).toHaveBeenCalledWith('default', {
        includeExecutionStats: true,
      });
      expect(searchSpies.getWorkflowAggs).toHaveBeenCalledWith(['name'], 'default');
      expect(searchSpies.getWorkflowAggs).toHaveBeenCalledWith(['tags'], 'default', {
        managedFilter: 'all',
      });
    });

    it('delegates execution reads to WorkflowExecutionQueryService', async () => {
      const service = await buildService();

      await service.getWorkflowExecution('exec-1', 'default', { includeInput: true });
      await service.getChildWorkflowExecutions('parent-1', 'default');
      await service.getWorkflowExecutions({ workflowId: 'wf-1' } as any, 'default');
      await service.getWorkflowExecutionHistory('exec-1', 'default');
      await service.getStepExecutions({ executionId: 'exec-1' } as any, 'default');
      await service.searchStepExecutions({ executionId: 'exec-1' } as any, 'default');
      await service.getExecutionLogs({ executionId: 'exec-1' } as any);
      await service.getStepLogs({ executionId: 'exec-1' } as any);
      await service.getStepExecution({ executionId: 'exec-1' } as any, 'default');

      expect(executionQuerySpies.getWorkflowExecution).toHaveBeenCalledWith('exec-1', 'default', {
        includeInput: true,
      });
      expect(executionQuerySpies.getChildWorkflowExecutions).toHaveBeenCalledWith(
        'parent-1',
        'default'
      );
      expect(executionQuerySpies.getWorkflowExecutions).toHaveBeenCalled();
      expect(executionQuerySpies.getWorkflowExecutionHistory).toHaveBeenCalled();
      expect(executionQuerySpies.getStepExecutions).toHaveBeenCalled();
      expect(executionQuerySpies.searchStepExecutions).toHaveBeenCalled();
      expect(executionQuerySpies.getExecutionLogs).toHaveBeenCalled();
      expect(executionQuerySpies.getStepLogs).toHaveBeenCalled();
      expect(executionQuerySpies.getStepExecution).toHaveBeenCalled();
    });

    it('delegates validation operations to WorkflowValidationService', async () => {
      const service = await buildService();
      const request = {} as any;

      await service.getAvailableConnectors('default', request);
      await service.validateWorkflow('name: wf', 'default', request);
      await service.getWorkflowZodSchema({ loose: false }, 'default', request);

<<<<<<< HEAD
      expect(validationSpies.getAvailableConnectors).toHaveBeenCalledWith('default', request);
      expect(validationSpies.validateWorkflow).toHaveBeenCalledWith('name: wf', 'default', request);
      expect(validationSpies.getWorkflowZodSchema).toHaveBeenCalledWith(
=======
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
    it('should return workflow execution with steps, excluding I/O by default', async () => {
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

      // Verify the step executions search call (includeInput/includeOutput default to false)
      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        query: {
          match: { workflowRunId: 'execution-1' },
        },
        _source: { excludes: ['input', 'output'] },
        sort: 'startedAt:desc',
        size: 10000,
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
      expect(result.connectorTypes['.slack']).toBeDefined();
      expect(result.connectorTypes['.email']).toBeDefined();

      expect(result.connectorTypes['.slack']).toEqual({
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

      expect(result.connectorTypes['.email']).toEqual({
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
      expect(result.connectorTypes['.slack']).toBeDefined();
      expect(result.connectorTypes['.email']).toBeDefined();

      // Slack has an instance
      expect(result.connectorTypes['.slack'].instances).toHaveLength(1);

      // Email has no instances but still appears
      expect(result.connectorTypes['.email'].instances).toHaveLength(0);
      expect(result.connectorTypes['.email'].actionTypeId).toBe('.email');
      expect(result.connectorTypes['.email'].displayName).toBe('Email');
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
      expect(result.connectorTypes['.slack'].instances).toHaveLength(3);
      expect(result.connectorTypes['.slack'].instances).toEqual([
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
      expect(result.connectorTypes).toEqual({});
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
      // Only .slack should be in connectorTypes since .unknown is not in actionTypes
      expect(result.connectorTypes['.slack']).toBeDefined();
      expect(result.connectorTypes['.unknown']).toBeUndefined();
      // The .slack connector should still be included
      expect(result.connectorTypes['.slack'].instances).toHaveLength(1);
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

  describe('validateWorkflowId', () => {
    const mockRequest = {
      auth: { credentials: { username: 'test-user' } },
    } as any;

    const makeCommand = (id: string) => ({
      yaml: 'name: Test Workflow\nenabled: true\ndefinition:\n  triggers: []',
      id,
    });

    const expectValid = async (id: string) => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: id } as any);
      await expect(
        service.createWorkflow(makeCommand(id), 'default', mockRequest)
      ).resolves.toBeDefined();
    };

    const expectInvalid = async (id: string) => {
      await expect(
        service.createWorkflow(makeCommand(id), 'default', mockRequest)
      ).rejects.toMatchObject({
        name: 'WorkflowValidationError',
        message: `Invalid workflow ID format. Expected format: lowercase alphanumeric characters with optional hyphens in the middle, received: ${id}`,
        statusCode: 400,
      });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    };

    it.each([
      ['hyphenated semantic', 'security-alert-enrichment'],
      ['short hyphenated', 'daily-log-cleanup'],
      ['simple semantic', 'user-onboarding'],
      ['numeric suffix', 'incident-response-2024'],
      ['3-character minimum', 'dev'],
      ['4-character', 'test'],
      ['environment-style', 'prod'],
      ['plain UUID', '550e8400-e29b-41d4-a716-446655440000'],
      ['workflow-{uuid} format', 'workflow-550e8400-e29b-41d4-a716-446655440000'],
      ['version suffix', 'backup-v2'],
      ['year suffix', 'migration-2024'],
    ])('should accept valid %s ID: %s', async (_label, id) => {
      await expectValid(id);
    });

    it.each([
      ['contains @', 'alert@notification'],
      ['contains spaces', 'alert notification'],
      ['contains dots', 'alert.process'],
      ['starts with hyphen', '-alert'],
      ['ends with hyphen', 'alert-'],
      ['starts with underscore', '_alert'],
      ['ends with underscore', 'alert_'],
      ['uppercase mixed-case', 'Security-Alert-Enrichment'],
      ['snake_case', 'process_security_alerts'],
      ['snake_case multi-segment', 'analyze_user_behavior'],
    ])('should reject invalid ID (%s): %s', async (_label, id) => {
      await expectInvalid(id);
    });

    it('should skip validation and auto-generate a slug ID when empty string is provided', async () => {
      // An empty string is falsy, so the `if (workflow.id)` guard in createWorkflow
      // skips validateWorkflowId entirely and derives a slug from the workflow name.
      // The YAML in makeCommand has name "Test Workflow" which doesn't pass schema
      // validation, so the default name "Untitled workflow" is used -> "untitled-workflow".
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'untitled-workflow' } as any);

      const result = await service.createWorkflow(makeCommand(''), 'default', mockRequest);

      expect(result.id).toBe('untitled-workflow');
      expect(mockEsClient.index).toHaveBeenCalled();
    });
  });

  describe('generateWorkflowId (via createWorkflow)', () => {
    const mockRequest = {
      auth: { credentials: { username: 'test-user' } },
    } as any;

    const validYaml = (name: string) => `
name: ${name}
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`;

    it('should derive a slug-based ID from the workflow name', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'my-workflow' } as any);

      const result = await service.createWorkflow(
        { yaml: validYaml('My Workflow') },
        'default',
        mockRequest
      );

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-workflow' })
      );
      expect(result.id).toBe('my-workflow');
    });

    it('should fall back to workflow-{uuid} when slug is too short', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'workflow-auto' } as any);

      await service.createWorkflow({ yaml: validYaml('Hi') }, 'default', mockRequest);

      const indexCall = mockEsClient.index.mock.calls[0][0] as { id: string };
      expect(indexCall.id).toMatch(/^workflow-[0-9a-f-]+$/);
    });

    it('should fall back to workflow-{uuid} when name has only special characters', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'workflow-auto' } as any);

      await service.createWorkflow({ yaml: validYaml('"!!!"') }, 'default', mockRequest);

      const indexCall = mockEsClient.index.mock.calls[0][0] as { id: string };
      expect(indexCall.id).toMatch(/^workflow-[0-9a-f-]+$/);
    });

    it('should strip diacritics and produce a valid slug', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'alerte-securite' } as any);

      await service.createWorkflow({ yaml: validYaml('Alèrte Sécurité') }, 'default', mockRequest);

      const indexCall = mockEsClient.index.mock.calls[0][0] as { id: string };
      expect(indexCall.id).toBe('alerte-securite');
    });
  });

  // Detailed collision/suffix/truncation/UUID-fallback tests live in workflow_id_resolver.test.ts.
  // These smoke tests verify the service wiring (resolver is called and result is used).
  describe('resolveUniqueWorkflowIds wiring (via createWorkflow)', () => {
    const mockRequest = {
      auth: { credentials: { username: 'test-user' } },
    } as any;

    const validYaml = `
name: My Workflow
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`;

    it('should use base slug when no collision exists', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'my-workflow' } as any);

      const result = await service.createWorkflow({ yaml: validYaml }, 'default', mockRequest);

      expect(result.id).toBe('my-workflow');
    });

    it('should use suffixed ID when base slug collides', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'my-workflow',
              _source: {
                name: 'Existing',
                enabled: true,
                spaceId: 'default',
                yaml: 'name: Existing',
                valid: true,
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z',
                createdBy: 'test-user',
                lastUpdatedBy: 'test-user',
              },
            },
          ],
        },
      } as any);
      mockEsClient.index.mockResolvedValue({ _id: 'my-workflow-1' } as any);

      const result = await service.createWorkflow({ yaml: validYaml }, 'default', mockRequest);

      expect(result.id).toBe('my-workflow-1');
    });
  });

  describe('bulkCreateWorkflows same-name collision', () => {
    const mockRequest = {
      auth: { credentials: { username: 'test-user' } },
    } as any;

    it('should deduplicate in-batch IDs when two workflows have the same name', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        items: [
          { create: { _id: 'duplicate-name', status: 201 } },
          { create: { _id: 'duplicate-name-1', status: 201 } },
        ],
        took: 10,
      } as any);

      const yaml = `
name: Duplicate Name
triggers:
  - type: manual
steps:
  - type: console
    name: step-one
    with:
      message: "Hello"
`;

      const result = await service.bulkCreateWorkflows(
        [{ yaml }, { yaml }],
        'default',
        mockRequest
      );

      const bulkCall = mockEsClient.bulk.mock.calls[0][0] as {
        operations: Array<{ create: { _id: string } }>;
      };
      const ids = bulkCall.operations
        .filter((op): op is { create: { _id: string } } => 'create' in op)
        .map((op) => op.create._id);

      // First workflow keeps the original slug, second gets a suffix
      expect(ids[0]).toBe('duplicate-name');
      expect(ids[1]).toBe('duplicate-name-1');

      expect(result.created).toHaveLength(2);
    });
  });

  describe('validateWorkflow', () => {
    const mockRequest = {} as any;

    it('should resolve the schema and delegate to validateWorkflowYaml', async () => {
      const mockSchema = z.object({ name: z.string() });
      jest.spyOn(service, 'getWorkflowZodSchema').mockResolvedValue(mockSchema);

      const result = await service.validateWorkflow('name: Test', 'my-space', mockRequest);

      expect(service.getWorkflowZodSchema).toHaveBeenCalledWith(
>>>>>>> 9.4
        { loose: false },
        'default',
        request
      );
    });
  });

  describe('error propagation', () => {
    it('surfaces rejections from sub-services untouched', async () => {
      const service = await buildService();
      const boom = new Error('sub-service failure');
      (crudSpies.getWorkflow as jest.SpyInstance).mockRejectedValueOnce(boom);

      await expect(service.getWorkflow('wf-1', 'default')).rejects.toBe(boom);
    });
  });

  describe('listWaitingForInputSteps', () => {
    it('delegates to WorkflowExecutionQueryService.listWaitingForInputSteps after init', async () => {
      // Behavioural coverage for this method lives next to the implementation
      // in `services/workflow_execution_query_service.test.ts`. This facade
      // test only asserts the delegation shape.
      const listSpy = jest
        .spyOn(WorkflowExecutionQueryService.prototype, 'listWaitingForInputSteps')
        .mockResolvedValue({ results: [], total: 0 } as never);
      try {
        const service = await buildService();
        await service.listWaitingForInputSteps('my-space', { page: 2, perPage: 25 });
        expect(listSpy).toHaveBeenCalledWith('my-space', { page: 2, perPage: 25 });
      } finally {
        listSpy.mockRestore();
      }
    });
  });
});
