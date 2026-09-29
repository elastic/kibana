/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { KibanaRequest } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { ConcreteTaskInstance, TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';

vi.mock('./repositories/data_access_layer', async () => {
  const actual = await vi.importActual('./repositories/data_access_layer');
  const { createDataClientJestMock } = await vi.importActual('./test_utils/data_client_jest_mock');
  return {
    ...actual,
    createDataClientBundle: vi.fn(() => createDataClientJestMock()),
  };
});
vi.mock('./lib/check_license', () => {
  const mocked = {
    checkLicense: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});
vi.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    currentTransaction: null,
    startSpan: vi.fn().mockReturnValue({ end: vi.fn() }),
  },
}));

const mockGetWorkflow = vi.fn();
const mockIsWorkflowEnabledRealtime = vi.fn().mockResolvedValue(true);
vi.mock('@kbn/workflows', async () => {
  const actual = await vi.importActual('@kbn/workflows');
  return {
    ...actual,
    WorkflowRepository: vi.fn().mockImplementation(() => ({
      getWorkflow: mockGetWorkflow,
      isWorkflowEnabledRealtime: mockIsWorkflowEnabledRealtime,
    })),
  };
});

vi.mock('./lib/get_user', () => {
  const mocked = {
    getAuthenticatedUser: vi.fn().mockResolvedValue('test-user'),
  };
  return { ...mocked, default: mocked };
});

const mockRunWorkflow = vi.fn();
const mockCheckAndSkipIfExistingScheduledExecution = vi.fn();
vi.mock('./execution_functions', async () => {
  const actual = await vi.importActual('./execution_functions');
  return {
    ...actual,
    runWorkflow: (...args: unknown[]) => mockRunWorkflow(...args),
    checkAndSkipIfExistingScheduledExecution: (...args: unknown[]) =>
      mockCheckAndSkipIfExistingScheduledExecution(...args),
  };
});

vi.mock('./concurrency/maybe_schedule_dormant_queued_run', () => {
  const mocked = {
    handleConcurrencyBlockedExecution: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./concurrency/concurrency_queue_drainer', () => {
  const mocked = {
    maybeDrainConcurrencyQueueBeforeEnqueue: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

const mockCheckConcurrency = vi.fn().mockResolvedValue(true);
const mockEvaluateConcurrencyKey = vi.fn().mockReturnValue('group-1');
vi.mock('./concurrency/concurrency_manager', () => {
  const mocked = {
    ConcurrencyManager: vi.fn().mockImplementation(() => ({
      checkConcurrency: (...args: unknown[]) => mockCheckConcurrency(...args),
      evaluateConcurrencyKey: (...args: unknown[]) => mockEvaluateConcurrencyKey(...args),
    })),
  };
  return { ...mocked, default: mocked };
});

const mockDiscardUnstartedExecution = vi.fn().mockResolvedValue(undefined);
const mockCreateWorkflowExecution = vi.fn().mockResolvedValue(undefined);
const mockGetWorkflowExecutionById = vi.fn().mockResolvedValue(null);
vi.mock('./repositories/workflow_execution_repository', () => {
  const mocked = {
    WorkflowExecutionRepository: vi.fn().mockImplementation(() => ({
      createWorkflowExecution: mockCreateWorkflowExecution,
      discardUnstartedExecution: mockDiscardUnstartedExecution,
      getWorkflowExecutionById: mockGetWorkflowExecutionById,
    })),
  };
  return { ...mocked, default: mocked };
});

import { UNKNOWN_EXECUTION_IDENTITY } from './lib/execution_identity';
import { getAuthenticatedUser } from './lib/get_user';
import { WorkflowsExecutionEnginePlugin } from './plugin';
import { WORKFLOW_SCHEDULED_TASK_TYPE } from './workflow_task_manager/types';

describe('workflow:scheduled task runner', () => {
  const workflowId = 'missing-workflow';
  const spaceId = 'default';
  const taskState = {
    lastRunAt: null,
    lastRunStatus: null,
    lastRunError: null,
  };

  let taskDefinitions: Record<string, TaskRegisterDefinition>;
  let initializerContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let plugin: WorkflowsExecutionEnginePlugin;
  let coreStart: ReturnType<typeof coreMock.createStart>;

  const createTaskInstance = (): ConcreteTaskInstance =>
    ({
      id: `workflow:${workflowId}:scheduled`,
      taskType: WORKFLOW_SCHEDULED_TASK_TYPE,
      params: { workflowId, spaceId, triggerType: 'scheduled' },
      state: taskState,
      attempts: 1,
      runAt: new Date('2024-01-01T10:00:00Z'),
      scheduledAt: new Date('2024-01-01T09:55:00Z'),
      startedAt: new Date('2024-01-01T10:00:00Z'),
      retryAt: null,
      status: TaskStatus.Running,
      ownerId: 'kibana-instance-id',
      schedule: { interval: '1h' },
    } as ConcreteTaskInstance);

  const setupPlugin = () => {
    taskDefinitions = {};
    initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    });
    plugin = new WorkflowsExecutionEnginePlugin(initializerContext);
    const coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([
      coreStart,
      {
        taskManager: taskManagerMock.createStart(),
        actions: {} as never,
        workflowsExtensions: {} as never,
        licensing: licensingMock.createStart(),
      },
      {} as never,
    ]);

    const taskManagerSetup = taskManagerMock.createSetup();
    taskManagerSetup.registerTaskDefinitions.mockImplementation((definitions) => {
      Object.assign(taskDefinitions, definitions);
    });

    plugin.setup(coreSetup as never, {
      taskManager: taskManagerSetup,
      cloud: {} as never,
      workflowsExtensions: { registerConnectorAdapter: vi.fn() } as never,
    });

    plugin.start(coreStart, {
      taskManager: taskManagerMock.createStart(),
      actions: {} as never,
      cloud: {} as never,
      workflowsExtensions: {} as never,
      licensing: licensingMock.createStart(),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkflow.mockResolvedValue(null);
    mockCheckAndSkipIfExistingScheduledExecution.mockResolvedValue({ skipped: false });
    mockCheckConcurrency.mockResolvedValue(true);
    mockEvaluateConcurrencyKey.mockReturnValue('group-1');
    mockCreateWorkflowExecution.mockResolvedValue(undefined);
    mockGetWorkflowExecutionById.mockResolvedValue(null);
    mockRunWorkflow.mockResolvedValue(undefined);
  });

  it('requests task deletion when the workflow document is missing', async () => {
    setupPlugin();
    const logger = initializerContext.logger.get();
    const errorSpy = vi.spyOn(logger, 'error');

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    const result = await runner.run();

    expect(result).toEqual({
      state: taskState,
      shouldDeleteTask: true,
    });
    expect(mockGetWorkflow).toHaveBeenCalledWith(workflowId, spaceId, { includeGlobal: true });
    expect(mockCheckAndSkipIfExistingScheduledExecution).not.toHaveBeenCalled();
    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      `Workflow ${workflowId} not found in space ${spaceId}; removing orphaned scheduled task`
    );
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'queued_deleted',
    });
  });

  it('skips the run without deleting the task when the workflow document is disabled', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: false,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: false,
        triggers: [{ type: 'scheduled' }],
        steps: [],
      },
    });
    const logger = initializerContext.logger.get();
    const warnSpy = vi.spyOn(logger, 'warn');

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    const result = await runner.run();

    expect(result).toEqual({
      state: taskState,
    });
    expect(mockGetWorkflow).toHaveBeenCalledWith(workflowId, spaceId, { includeGlobal: true });
    expect(mockCheckAndSkipIfExistingScheduledExecution).not.toHaveBeenCalled();
    expect(mockCreateWorkflowExecution).not.toHaveBeenCalled();
    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      `Workflow ${workflowId} is disabled in space ${spaceId}; skipping leftover scheduled run`
    );
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'skipped',
    });
  });

  it('rejects a scheduled bound execution if deletion wins during its write', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
        settings: { run_as: 'account' },
      },
    });
    mockCreateWorkflowExecution.mockImplementationOnce(async (_execution, options) => {
      expect(options.refresh).toBe('wait_for');
      mockIsWorkflowEnabledRealtime.mockResolvedValueOnce(false);
    });
    const definition = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE];
    const runner = definition.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
      })
    );
    await expect(runner.run()).rejects.toThrow('Workflow is disabled');
    expect(mockDiscardUnstartedExecution).toHaveBeenCalledWith(expect.any(String), spaceId);
    expect(mockRunWorkflow).not.toHaveBeenCalled();
  });

  it('stamps skipped when dedupe check skips the scheduled run', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      definition: { triggers: [{ type: 'scheduled' }] },
    });
    mockCheckAndSkipIfExistingScheduledExecution.mockResolvedValue({
      skipped: true,
      workflowExecutionId: 'skipped-exec-1',
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockCheckAndSkipIfExistingScheduledExecution).toHaveBeenCalled();
    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: 'skipped-exec-1',
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'skipped',
    });
  });

  it('stamps skipped when concurrency drop marks execution skipped', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
        settings: { concurrency: { key: 'g1', strategy: 'drop', max: 1 } },
      },
    });
    mockCheckConcurrency.mockResolvedValue(false);
    mockCreateWorkflowExecution.mockImplementation(async (execution: { id: string }) => {
      mockGetWorkflowExecutionById.mockResolvedValue({
        id: execution.id,
        workflowId,
        spaceId,
        status: ExecutionStatus.SKIPPED,
      });
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: expect.any(String),
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'skipped',
    });
  });

  it('stamps completed on happy-path scheduled run', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
      },
    });
    mockCreateWorkflowExecution.mockImplementation(async (execution: { id: string }) => {
      mockGetWorkflowExecutionById.mockResolvedValue({
        id: execution.id,
        workflowId,
        spaceId,
        status: ExecutionStatus.COMPLETED,
      });
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockRunWorkflow).toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: expect.any(String),
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'completed',
    });
  });

  it('stamps failed with workflow_execution_id when run fails after create', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
      },
    });
    let createdId: string | undefined;
    mockCreateWorkflowExecution.mockImplementation(async (execution: { id: string }) => {
      createdId = execution.id;
    });
    mockRunWorkflow.mockRejectedValue(new Error('run failed'));

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await expect(runner.run()).rejects.toThrow('run failed');
    expect(createdId).toBeDefined();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: createdId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'failed',
    });
  });

  it('stamps cancelled when scheduled run completes after abort', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
      },
    });
    let createdId: string | undefined;
    mockCreateWorkflowExecution.mockImplementation(async (execution: { id: string }) => {
      createdId = execution.id;
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    mockRunWorkflow.mockImplementation(async () => {
      await runner.cancel!();
    });

    await runner.run();

    expect(createdId).toBeDefined();
    expect(setCustomTaskRunEventFields).toHaveBeenLastCalledWith({
      workflow_execution_id: createdId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'cancelled',
    });
  });

  it('stamps cancelled when scheduled run throws after abort', async () => {
    setupPlugin();
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
      },
    });
    let createdId: string | undefined;
    mockCreateWorkflowExecution.mockImplementation(async (execution: { id: string }) => {
      createdId = execution.id;
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    mockRunWorkflow.mockImplementation(async () => {
      await runner.cancel!();
      throw new Error('aborted mid-run');
    });

    await expect(runner.run()).rejects.toThrow('aborted mid-run');
    expect(createdId).toBeDefined();
    expect(setCustomTaskRunEventFields).toHaveBeenLastCalledWith({
      workflow_execution_id: createdId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'cancelled',
    });
  });

  it('stamps cancelled on cancel', async () => {
    setupPlugin();

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.cancel!();

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'cancelled',
    });
  });

  it('completes without creating an execution when claimed without a Task Manager identity', async () => {
    setupPlugin();

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: undefined,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockCreateWorkflowExecution).not.toHaveBeenCalled();
    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'failed',
    });
  });

  it('persists a failed execution and does not run when no identity is resolved', async () => {
    setupPlugin();
    (getAuthenticatedUser as Mock).mockResolvedValueOnce(undefined);
    mockGetWorkflow.mockResolvedValue({
      id: workflowId,
      enabled: true,
      yaml: 'name: test',
      definition: {
        name: 'test',
        enabled: true,
        triggers: [{ type: 'scheduled' }],
        steps: [],
      },
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_SCHEDULED_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: createTaskInstance(),
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockCreateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ExecutionStatus.FAILED,
        executedBy: UNKNOWN_EXECUTION_IDENTITY,
      }),
      { refresh: 'wait_for' }
    );
    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: expect.any(String),
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'failed',
    });
  });
});
