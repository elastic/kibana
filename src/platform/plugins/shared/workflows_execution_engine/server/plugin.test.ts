/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  ExecutionStatus,
  NonTerminalExecutionStatuses,
  TerminalExecutionStatuses,
} from '@kbn/workflows';
import { checkAndSkipIfExistingScheduledExecution } from './execution_functions';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../common';

describe('checkAndSkipIfExistingScheduledExecution', () => {
  let esClient: jest.Mocked<Client>;
  let workflowExecutionRepository: WorkflowExecutionRepository;
  let logger: Logger;
  let workflow: WorkflowExecutionEngineModel;
  let currentTaskInstance: ConcreteTaskInstance;
  const spaceId = 'default';
  const baseRunAt = new Date('2024-01-01T10:00:00Z');

  const createMockTaskInstance = (
    overrides?: Partial<ConcreteTaskInstance>
  ): ConcreteTaskInstance => {
    return {
      id: 'task-id',
      taskType: 'workflow:scheduled',
      params: { workflowId: workflow.id, spaceId, triggerType: 'scheduled' },
      state: {},
      attempts: 1,
      runAt: baseRunAt,
      scheduledAt: baseRunAt,
      startedAt: baseRunAt,
      retryAt: null,
      status: TaskStatus.Running,
      ownerId: 'kibana-instance-id',
      ...overrides,
    } as ConcreteTaskInstance;
  };

  beforeEach(() => {
    esClient =
      elasticsearchServiceMock.createElasticsearchClient() as unknown as jest.Mocked<Client>;
    // Mock index existence check - index doesn't exist initially, then gets created
    if (!esClient.indices) {
      esClient.indices = {} as any;
    }
    esClient.indices.exists = jest.fn().mockResolvedValue(false) as any;
    esClient.indices.create = jest.fn().mockResolvedValue({}) as any;
    esClient.update = jest.fn().mockResolvedValue({} as any);
    workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
    logger = loggingSystemMock.create().get();
    workflow = {
      id: 'test-workflow-id',
      name: 'Test Workflow',
      enabled: true,
      definition: {
        name: 'Test Workflow',
        enabled: false,
        version: '1',
        triggers: [
          {
            type: 'scheduled',
            with: {
              every: '1h',
            },
          },
        ],
        steps: [],
      },
      yaml: 'test yaml',
      isTestRun: false,
    };

    currentTaskInstance = createMockTaskInstance();
    jest.clearAllMocks();
  });

  describe('when no existing non-terminal scheduled execution exists', () => {
    it('should return false and not create a skipped execution', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query: {
          bool: {
            filter: [
              { term: { workflowId: workflow.id } },
              { term: { spaceId } },
              {
                terms: {
                  status: NonTerminalExecutionStatuses,
                },
              },
              { term: { triggeredBy: 'scheduled' } },
            ],
          },
        },
        size: 1,
        terminate_after: 1,
      });
      expect(esClient.index).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('when existing non-terminal scheduled execution exists', () => {
    it('should create a SKIPPED execution and return true', async () => {
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(true);
      expect(esClient.index).toHaveBeenCalledTimes(1);
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          refresh: false,
          id: expect.any(String),
          document: expect.objectContaining({
            spaceId,
            workflowId: workflow.id,
            status: ExecutionStatus.SKIPPED,
            triggeredBy: 'scheduled',
            workflowDefinition: workflow.definition,
            yaml: workflow.yaml,
            isTestRun: workflow.isTestRun,
            cancelRequested: true,
            cancellationReason: 'Skipped due to existing non-terminal scheduled execution',
            cancelledAt: expect.any(String),
            cancelledBy: 'system',
            context: expect.objectContaining({
              spaceId,
              event: {
                type: 'scheduled',
                source: 'task-manager',
                timestamp: expect.any(String),
              },
              triggeredBy: 'scheduled',
            }),
          }),
        })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          `Skipping scheduled workflow ${workflow.id} execution - found existing non-terminal scheduled execution`
        )
      );
    });

    it('should handle different non-terminal statuses (PENDING, WAITING, WAITING_FOR_INPUT, RUNNING)', async () => {
      const nonTerminalStatuses = [
        ExecutionStatus.PENDING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING_FOR_INPUT,
        ExecutionStatus.RUNNING,
      ];

      for (const status of nonTerminalStatuses) {
        esClient.search.mockResolvedValue({
          hits: {
            hits: [
              {
                _source: {
                  id: 'existing-execution-id',
                  workflowId: workflow.id,
                  spaceId,
                  status,
                  triggeredBy: 'scheduled',
                },
              },
            ],
            total: { value: 1, relation: 'eq' },
          },
        } as any);
        esClient.index.mockResolvedValue({} as any);
        (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

        const result = await checkAndSkipIfExistingScheduledExecution(
          workflow,
          spaceId,
          workflowExecutionRepository,
          currentTaskInstance,
          logger
        );

        expect(result).toBe(true);
        expect(esClient.index).toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should not skip when only terminal status executions exist', async () => {
      for (const _status of TerminalExecutionStatuses) {
        esClient.search.mockResolvedValue({
          hits: {
            hits: [],
            total: { value: 0, relation: 'eq' },
          },
        } as any);

        const result = await checkAndSkipIfExistingScheduledExecution(
          workflow,
          spaceId,
          workflowExecutionRepository,
          currentTaskInstance,
          logger
        );

        expect(result).toBe(false);
        expect(esClient.index).not.toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should not skip when existing execution is for a different workflow', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        { ...workflow, id: 'different-workflow-id' },
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should not skip when existing execution is for a different space', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        'different-space',
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should not skip when existing execution is not scheduled (triggeredBy !== scheduled)', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should create skipped execution with correct context structure', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'existing-execution-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.RUNNING,
                triggeredBy: 'scheduled',
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.context).toMatchObject({
        spaceId,
        inputs: {},
        event: {
          type: 'scheduled',
          source: 'task-manager',
          timestamp: expect.any(String),
        },
        triggeredBy: 'scheduled',
      });
      expect(indexCall.document.context.workflowRunId).toMatch(/^scheduled-\d+$/);
    });
  });

  describe('taskRunAt comparison logic', () => {
    it('should mark execution as FAILED and proceed when taskRunAt matches AND attempts > 1 (stale execution from task recovery)', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.PENDING,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.update.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      // Use attempts > 1 to indicate this is a retry/recovery
      const retryTaskInstance = createMockTaskInstance({ attempts: 2 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        retryTaskInstance,
        logger
      );

      expect(result).toBe(false); // Proceed with new execution
      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          id: 'existing-execution-id',
          doc: expect.objectContaining({
            status: ExecutionStatus.FAILED,
            error: {
              type: 'TaskRecoveryError',
              message: expect.stringContaining('recovery mechanism'),
            },
          }),
        })
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Found stale execution'));
      expect(esClient.index).not.toHaveBeenCalled(); // No SKIPPED execution created
    });

    it('should skip (not mark as failed) when taskRunAt matches BUT attempts = 1 (first attempt, execution from this run)', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.PENDING,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      // Use attempts = 1 (first attempt)
      const firstAttemptTaskInstance = createMockTaskInstance({ attempts: 1 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        firstAttemptTaskInstance,
        logger
      );

      expect(result).toBe(true); // Skip (don't mark as failed - execution is from this attempt)
      expect(esClient.update).not.toHaveBeenCalled(); // Don't mark as failed
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            status: ExecutionStatus.SKIPPED,
          }),
        })
      );
    });

    it('should skip when taskRunAt differs (legitimate concurrent execution from different scheduled run)', async () => {
      const differentRunAt = new Date('2024-01-01T09:00:00Z').toISOString(); // Different scheduled run
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          taskRunAt: differentRunAt,
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(true); // Skip current run
      expect(esClient.update).not.toHaveBeenCalled(); // Don't mark as failed
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          document: expect.objectContaining({
            status: ExecutionStatus.SKIPPED,
          }),
        })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping scheduled workflow')
      );
    });

    it('should skip when execution has no taskRunAt (legacy execution)', async () => {
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          // No taskRunAt field (legacy execution)
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(true); // Skip to be safe
      expect(esClient.update).not.toHaveBeenCalled(); // Don't mark legacy execution as failed
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            status: ExecutionStatus.SKIPPED,
          }),
        })
      );
    });

    it('should skip when current task has no runAt', async () => {
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          taskRunAt: baseRunAt.toISOString(),
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      const taskInstanceWithoutRunAt = createMockTaskInstance({ runAt: undefined as any });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        taskInstanceWithoutRunAt,
        logger
      );

      expect(result).toBe(true); // Skip when we can't compare
      expect(esClient.update).not.toHaveBeenCalled();
      expect(esClient.index).toHaveBeenCalled();
    });

    it('should handle RUNNING status execution with matching taskRunAt AND attempts > 1 (stale)', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.update.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      // Use attempts > 1 to indicate this is a retry/recovery
      const retryTaskInstance = createMockTaskInstance({ attempts: 2 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        retryTaskInstance,
        logger
      );

      expect(result).toBe(false); // Proceed - mark stale as failed
      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            status: ExecutionStatus.FAILED,
          }),
        })
      );
    });
  });
});

describe('QUEUED execution cancellation', () => {
  it('should directly transition QUEUED execution to CANCELLED without TM interaction', async () => {
    const esClient =
      elasticsearchServiceMock.createElasticsearchClient() as unknown as jest.Mocked<Client>;
    esClient.update = jest.fn().mockResolvedValue({} as any);
    esClient.get = jest.fn().mockResolvedValue({
      _source: {
        id: 'queued-exec-1',
        workflowId: 'wf-1',
        spaceId: 'default',
        status: ExecutionStatus.QUEUED,
      },
    } as any);

    const repo = new WorkflowExecutionRepository(esClient);

    const execution = await repo.getWorkflowExecutionById('queued-exec-1', 'default');
    expect(execution?.status).toBe(ExecutionStatus.QUEUED);

    await repo.updateWorkflowExecution({
      id: 'queued-exec-1',
      status: ExecutionStatus.CANCELLED,
      cancelRequested: true,
      cancellationReason: 'Cancelled by user',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'system',
    });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: 'queued-exec-1',
        doc: expect.objectContaining({
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
          cancellationReason: 'Cancelled by user',
        }),
      })
    );
  });
});

describe('promoteNextQueuedIfNeeded orchestration', () => {
  let plugin: any;
  let mockRepo: any;
  let mockTaskManager: any;
  let mockLogger: Logger;
  let mockRequest: any;

  const queueConcurrencySettings = {
    key: 'group-1',
    strategy: 'queue' as const,
    max: 1,
    maxQueueSize: 10,
  };

  const makeExecution = (overrides: Record<string, unknown> = {}) => ({
    id: 'completed-exec',
    workflowId: 'wf-1',
    spaceId: 'default',
    status: ExecutionStatus.COMPLETED,
    concurrencyGroupKey: 'group-1',
    workflowDefinition: { settings: { concurrency: queueConcurrencySettings } },
    ...overrides,
  });

  beforeEach(() => {
    mockLogger = loggingSystemMock.create().get();
    mockRequest = { isFakeRequest: true } as any;

    mockRepo = {
      getWorkflowExecutionById: jest.fn(),
      getRunningExecutionsByConcurrencyGroup: jest.fn(),
      getQueuedExecutionsByConcurrencyGroup: jest.fn(),
      promoteQueuedExecution: jest.fn(),
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
      searchWorkflowExecutions: jest.fn().mockResolvedValue([]),
    };
    mockTaskManager = {
      scheduleExecutionTask: jest.fn().mockResolvedValue(undefined),
    };

    const initializerContext = {
      logger: { get: () => mockLogger },
      config: { get: () => ({ collectQueueMetrics: false, logging: { console: false } }) },
      env: { packageInfo: { version: '8.0.0' } },
    };

    const { WorkflowsExecutionEnginePlugin } = jest.requireActual('./plugin');
    plugin = new WorkflowsExecutionEnginePlugin(initializerContext);
    plugin.workflowExecutionRepository = mockRepo;
    plugin.workflowTaskManager = mockTaskManager;
  });

  it('should promote oldest queued execution when a slot frees up', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(makeExecution());
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue([]);
    mockRepo.getQueuedExecutionsByConcurrencyGroup.mockResolvedValue([
      { id: 'queued-1', workflowId: 'wf-1' },
    ]);
    mockRepo.promoteQueuedExecution.mockResolvedValue('updated');

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.promoteQueuedExecution).toHaveBeenCalledWith('queued-1');
    expect(mockTaskManager.scheduleExecutionTask).toHaveBeenCalledWith({
      executionId: 'queued-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      fakeRequest: mockRequest,
    });
  });

  it('should promote multiple queued executions when multiple slots are free', async () => {
    const execution = makeExecution({
      workflowDefinition: {
        settings: { concurrency: { ...queueConcurrencySettings, max: 3 } },
      },
    });
    mockRepo.getWorkflowExecutionById.mockResolvedValue(execution);
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue([]);
    mockRepo.getQueuedExecutionsByConcurrencyGroup.mockResolvedValue([
      { id: 'queued-1', workflowId: 'wf-1' },
      { id: 'queued-2', workflowId: 'wf-1' },
      { id: 'queued-3', workflowId: 'wf-1' },
    ]);
    mockRepo.promoteQueuedExecution.mockResolvedValue('updated');

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.promoteQueuedExecution).toHaveBeenCalledTimes(3);
    expect(mockTaskManager.scheduleExecutionTask).toHaveBeenCalledTimes(3);
  });

  it('should not promote when no slots are available', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(makeExecution());
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue(['active-exec-1']);

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.getQueuedExecutionsByConcurrencyGroup).not.toHaveBeenCalled();
    expect(mockRepo.promoteQueuedExecution).not.toHaveBeenCalled();
  });

  it('should exclude terminal triggering execution from active count', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(
      makeExecution({ status: ExecutionStatus.COMPLETED })
    );
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue([]);
    mockRepo.getQueuedExecutionsByConcurrencyGroup.mockResolvedValue([]);

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.getRunningExecutionsByConcurrencyGroup).toHaveBeenCalledWith(
      'group-1',
      'default',
      'completed-exec' // excluded because status is terminal
    );
  });

  it('should NOT exclude non-terminal triggering execution from active count', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(
      makeExecution({ status: ExecutionStatus.WAITING })
    );
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue(['completed-exec']);

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.getRunningExecutionsByConcurrencyGroup).toHaveBeenCalledWith(
      'group-1',
      'default',
      undefined // NOT excluded because WAITING is non-terminal and occupies a slot
    );
  });

  it('should skip promotion when CAS returns noop (concurrent promoter won)', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(makeExecution());
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue([]);
    mockRepo.getQueuedExecutionsByConcurrencyGroup.mockResolvedValue([
      { id: 'queued-1', workflowId: 'wf-1' },
    ]);
    mockRepo.promoteQueuedExecution.mockResolvedValue('noop');

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.promoteQueuedExecution).toHaveBeenCalledWith('queued-1');
    expect(mockTaskManager.scheduleExecutionTask).not.toHaveBeenCalled();
  });

  it('should revert to QUEUED when task scheduling fails after promotion', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(makeExecution());
    mockRepo.getRunningExecutionsByConcurrencyGroup.mockResolvedValue([]);
    mockRepo.getQueuedExecutionsByConcurrencyGroup.mockResolvedValue([
      { id: 'queued-1', workflowId: 'wf-1' },
    ]);
    mockRepo.promoteQueuedExecution.mockResolvedValue('updated');
    mockTaskManager.scheduleExecutionTask.mockRejectedValue(new Error('TM unavailable'));

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.updateWorkflowExecution).toHaveBeenCalledWith(
      { id: 'queued-1', status: ExecutionStatus.QUEUED },
      { refresh: 'wait_for' }
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to schedule promoted execution queued-1')
    );
  });

  it('should no-op for non-queue strategy (drop)', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(
      makeExecution({
        workflowDefinition: {
          settings: { concurrency: { key: 'group-1', strategy: 'drop', max: 1 } },
        },
      })
    );

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.getRunningExecutionsByConcurrencyGroup).not.toHaveBeenCalled();
  });

  it('should no-op when execution has no concurrency group key', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(
      makeExecution({ concurrencyGroupKey: undefined })
    );

    await plugin.promoteNextQueuedIfNeeded('completed-exec', 'default', mockRequest);

    expect(mockRepo.getRunningExecutionsByConcurrencyGroup).not.toHaveBeenCalled();
  });

  it('should no-op when execution is not found', async () => {
    mockRepo.getWorkflowExecutionById.mockResolvedValue(null);

    await plugin.promoteNextQueuedIfNeeded('nonexistent', 'default', mockRequest);

    expect(mockRepo.getRunningExecutionsByConcurrencyGroup).not.toHaveBeenCalled();
  });

  it('should no-op when repository or task manager is not initialized', async () => {
    plugin.workflowExecutionRepository = undefined;

    await plugin.promoteNextQueuedIfNeeded('exec-1', 'default', mockRequest);

    expect(mockRepo.getWorkflowExecutionById).not.toHaveBeenCalled();
  });
});

describe('elastic-apm-node dynamic import pattern', () => {
  const mockStartSpan = jest.fn().mockReturnValue({ end: jest.fn() });
  const mockSetLabel = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.mock('elastic-apm-node', () => ({
      __esModule: true,
      default: {
        startSpan: mockStartSpan,
        currentTransaction: { setLabel: mockSetLabel },
      },
    }));
    mockStartSpan.mockClear();
    mockSetLabel.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should access startSpan on the default export when using destructured import', async () => {
    // This is the correct pattern used in plugin.ts:
    //   const { default: apm } = await import('elastic-apm-node');
    //   apm.startSpan(...)
    const { default: apm } = await import('elastic-apm-node');

    expect(typeof apm.startSpan).toBe('function');

    const span = apm.startSpan('test span', 'workflow', 'execution');
    expect(span).toBeDefined();
    expect(mockStartSpan).toHaveBeenCalledWith('test span', 'workflow', 'execution');
    span?.end();
  });

  it('should access currentTransaction on the default export when using destructured import', async () => {
    const { default: apm } = await import('elastic-apm-node');

    expect(apm.currentTransaction).toBeDefined();
    apm.currentTransaction?.setLabel('test_key', 'test_value');
    expect(mockSetLabel).toHaveBeenCalledWith('test_key', 'test_value');
  });

  it('should NOT have startSpan on module namespace (regression: non-destructured import)', async () => {
    // This was the bug: using `const apm = await import('elastic-apm-node')`
    // without destructuring puts the module namespace in `apm`, where
    // startSpan lives at apm.default.startSpan, not apm.startSpan
    const moduleNamespace = await import('elastic-apm-node');

    // startSpan should NOT exist on the module namespace directly
    expect((moduleNamespace as Record<string, unknown>).startSpan).toBeUndefined();

    // It must live on the default export
    expect(typeof moduleNamespace.default.startSpan).toBe('function');
  });
});
