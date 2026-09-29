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
  default: {
    currentTransaction: null,
    startSpan: vi.fn(),
  },
}));

const mockHandlePostExecutionLoop = vi.fn().mockResolvedValue(undefined);
vi.mock('./execution_functions/handle_post_execution_loop', () => {
  const mocked = {
    handlePostExecutionLoop: (...args: unknown[]) => mockHandlePostExecutionLoop(...args),
  };
  return { ...mocked, default: mocked };
});

const mockResolveInterruptedWorkflowRunTask = vi.fn();
const mockResolveExhaustedWorkflowRunTask = vi.fn().mockResolvedValue(undefined);
const mockFailExecutionMissingIdentity = vi.fn().mockResolvedValue(undefined);
vi.mock('./lib/task_recovery', async () => {
  const actual = await vi.importActual('./lib/task_recovery');
  return {
    ...actual,
    resolveInterruptedWorkflowRunTask: (...args: unknown[]) =>
      mockResolveInterruptedWorkflowRunTask(...args),
    resolveExhaustedWorkflowRunTask: (...args: unknown[]) =>
      mockResolveExhaustedWorkflowRunTask(...args),
    failExecutionMissingIdentity: (...args: unknown[]) => mockFailExecutionMissingIdentity(...args),
  };
});

const mockRunWorkflow = vi.fn();
vi.mock('./execution_functions', async () => {
  const actual = await vi.importActual('./execution_functions');
  return {
    ...actual,
    runWorkflow: (...args: unknown[]) => mockRunWorkflow(...args),
  };
});

const mockGetWorkflowExecutionById = vi.fn();
vi.mock('./repositories/workflow_execution_repository', () => {
  const mocked = {
    WorkflowExecutionRepository: vi.fn().mockImplementation(() => ({
      getWorkflowExecutionById: mockGetWorkflowExecutionById,
    })),
  };
  return { ...mocked, default: mocked };
});

import { WorkflowsExecutionEnginePlugin } from './plugin';
import { WORKFLOW_RUN_TASK_TYPE } from './workflow_task_manager/types';

describe('concurrency queue recovery wiring', () => {
  let taskDefinitions: Record<string, TaskRegisterDefinition>;

  const setupPlugin = () => {
    taskDefinitions = {};
    const initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    });
    const plugin = new WorkflowsExecutionEnginePlugin(initializerContext);
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
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

    return { plugin };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveInterruptedWorkflowRunTask.mockResolvedValue({ action: 'run_workflow' });
    mockResolveExhaustedWorkflowRunTask.mockResolvedValue(undefined);
    mockFailExecutionMissingIdentity.mockResolvedValue(undefined);
    mockRunWorkflow.mockResolvedValue(undefined);
    mockGetWorkflowExecutionById.mockResolvedValue(null);
  });

  const createRunContext = ({
    workflowRunId,
    spaceId = 'default',
    attempts = 1,
    setCustomTaskRunEventFields = vi.fn(),
  }: {
    workflowRunId: string;
    spaceId?: string;
    attempts?: number;
    setCustomTaskRunEventFields?: Mock;
  }) =>
    taskManagerMock.createRunContext({
      taskInstance: {
        id: `workflow:${workflowRunId}:manual`,
        taskType: WORKFLOW_RUN_TASK_TYPE,
        params: { workflowRunId, spaceId },
        state: {},
        attempts,
        runAt: new Date('2024-01-01T10:00:00Z'),
        scheduledAt: new Date('2024-01-01T09:55:00Z'),
        startedAt: new Date('2024-01-01T10:00:00Z'),
        retryAt: null,
        status: TaskStatus.Running,
        ownerId: 'kibana-instance-id',
      } as ConcreteTaskInstance,
      fakeRequest: {} as KibanaRequest,
      setCustomTaskRunEventFields,
    });

  it('workflow:run runs post-loop terminal side effects when interrupt recovery returns task_complete', async () => {
    setupPlugin();
    const workflowRunId = 'exec-interrupted';
    const workflowId = 'wf-interrupted';
    const spaceId = 'default';
    mockResolveInterruptedWorkflowRunTask.mockResolvedValue({
      action: 'task_complete',
      reason: 'interrupted',
      execution: {
        id: workflowRunId,
        workflowId,
        spaceId,
        status: ExecutionStatus.FAILED,
      },
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, spaceId, attempts: 2, setCustomTaskRunEventFields })
    );

    await runner.run();

    expect(mockResolveInterruptedWorkflowRunTask).toHaveBeenCalled();
    expect(mockHandlePostExecutionLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowRunId,
        spaceId,
        stepExecutionRepository: expect.anything(),
      })
    );
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'interrupted',
    });
  });

  it('stamps completed when interrupt recovery noop is already terminal', async () => {
    setupPlugin();
    const workflowRunId = 'exec-already-done';
    const workflowId = 'wf-already-done';
    mockResolveInterruptedWorkflowRunTask.mockResolvedValue({
      action: 'task_complete',
      reason: 'noop',
      execution: {
        id: workflowRunId,
        workflowId,
        spaceId: 'default',
        status: ExecutionStatus.COMPLETED,
      },
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, attempts: 2, setCustomTaskRunEventFields })
    );

    await runner.run();

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'completed',
    });
  });

  it('does not stamp when interrupt recovery noop is non-terminal', async () => {
    setupPlugin();
    const workflowRunId = 'exec-waiting-input';
    mockResolveInterruptedWorkflowRunTask.mockResolvedValue({
      action: 'task_complete',
      reason: 'noop',
      execution: {
        id: workflowRunId,
        workflowId: 'wf-1',
        spaceId: 'default',
        status: ExecutionStatus.WAITING_FOR_INPUT,
      },
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, attempts: 2, setCustomTaskRunEventFields })
    );

    await runner.run();

    expect(setCustomTaskRunEventFields).not.toHaveBeenCalled();
  });

  it('stamps queued_deleted when runWorkflow requests task deletion', async () => {
    setupPlugin();
    const workflowRunId = 'exec-queued-delete';
    const workflowId = 'wf-queued-delete';
    mockRunWorkflow.mockResolvedValue({ shouldDeleteTask: true });
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: ExecutionStatus.QUEUED,
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, setCustomTaskRunEventFields })
    );

    const result = await runner.run();

    expect(result).toEqual({ state: {}, shouldDeleteTask: true });
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'queued_deleted',
    });
  });

  it('stamps completed on happy-path terminal status', async () => {
    setupPlugin();
    const workflowRunId = 'exec-completed';
    const workflowId = 'wf-completed';
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: ExecutionStatus.COMPLETED,
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, setCustomTaskRunEventFields })
    );

    await runner.run();

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'completed',
    });
  });

  it('stamps failed when runWorkflow throws before max attempts', async () => {
    setupPlugin();
    const workflowRunId = 'exec-failed';
    const workflowId = 'wf-failed';
    mockRunWorkflow.mockRejectedValue(new Error('boom'));
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: ExecutionStatus.FAILED,
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, attempts: 1, setCustomTaskRunEventFields })
    );

    await expect(runner.run()).rejects.toThrow('boom');
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'failed',
    });
  });

  it('stamps interrupted when runWorkflow throws at max attempts', async () => {
    setupPlugin();
    const workflowRunId = 'exec-exhausted';
    const workflowId = 'wf-exhausted';
    mockRunWorkflow.mockRejectedValue(new Error('exhausted'));
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: ExecutionStatus.FAILED,
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, attempts: 3, setCustomTaskRunEventFields })
    );

    await expect(runner.run()).rejects.toThrow('exhausted');
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'interrupted',
    });
  });

  it('workflow:run cancel omits workflow_id', async () => {
    setupPlugin();

    const workflowRunId = 'exec-cancel';
    const spaceId = 'default';
    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, spaceId, setCustomTaskRunEventFields })
    );

    await runner.cancel!();

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      space_id: spaceId,
      outcome: 'cancelled',
    });
    expect(setCustomTaskRunEventFields.mock.calls[0][0]).not.toHaveProperty('workflow_id');
  });

  it('fails the execution when claimed without a Task Manager identity', async () => {
    setupPlugin();
    const workflowRunId = 'exec-no-identity';
    const workflowId = 'wf-no-identity';
    const spaceId = 'default';
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId,
      status: ExecutionStatus.FAILED,
    });

    const setCustomTaskRunEventFields = vi.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: `workflow:${workflowRunId}:manual`,
          taskType: WORKFLOW_RUN_TASK_TYPE,
          params: { workflowRunId, spaceId },
          state: {},
          attempts: 1,
          runAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T09:55:00Z'),
          startedAt: new Date('2024-01-01T10:00:00Z'),
          retryAt: null,
          status: TaskStatus.Running,
          ownerId: 'kibana-instance-id',
        } as ConcreteTaskInstance,
        fakeRequest: undefined,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockFailExecutionMissingIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowRunId,
        spaceId,
      })
    );
    expect(mockRunWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'failed',
    });
  });
});
