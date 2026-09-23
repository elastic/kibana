/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { ConcreteTaskInstance, TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';

jest.mock('./repositories/data_access_layer', () => {
  const actual = jest.requireActual('./repositories/data_access_layer');
  const { createDataClientJestMock } = jest.requireActual('./test_utils/data_client_jest_mock');
  return {
    ...actual,
    createDataClientBundle: jest.fn(() => createDataClientJestMock()),
  };
});
jest.mock('./lib/check_license', () => ({
  checkLicense: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('elastic-apm-node', () => ({
  default: {
    currentTransaction: null,
    startSpan: jest.fn(),
  },
}));

const mockHandlePostExecutionLoop = jest.fn().mockResolvedValue(undefined);
jest.mock('./execution_functions/handle_post_execution_loop', () => ({
  handlePostExecutionLoop: (...args: unknown[]) => mockHandlePostExecutionLoop(...args),
}));

const mockResolveInterruptedWorkflowRunTask = jest.fn();
const mockResolveExhaustedWorkflowRunTask = jest.fn().mockResolvedValue(undefined);
const mockFailExecutionMissingIdentity = jest.fn().mockResolvedValue(undefined);
jest.mock('./lib/task_recovery', () => {
  const actual = jest.requireActual('./lib/task_recovery');
  return {
    ...actual,
    resolveInterruptedWorkflowRunTask: (...args: unknown[]) =>
      mockResolveInterruptedWorkflowRunTask(...args),
    resolveExhaustedWorkflowRunTask: (...args: unknown[]) =>
      mockResolveExhaustedWorkflowRunTask(...args),
    failExecutionMissingIdentity: (...args: unknown[]) => mockFailExecutionMissingIdentity(...args),
  };
});

const mockRunWorkflow = jest.fn();
jest.mock('./execution_functions', () => {
  const actual = jest.requireActual('./execution_functions');
  return {
    ...actual,
    runWorkflow: (...args: unknown[]) => mockRunWorkflow(...args),
  };
});

const mockGetWorkflowExecutionById = jest.fn();
jest.mock('./repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    getWorkflowExecutionById: mockGetWorkflowExecutionById,
  })),
}));

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
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as never,
    });

    return { plugin };
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    setCustomTaskRunEventFields = jest.fn(),
  }: {
    workflowRunId: string;
    spaceId?: string;
    attempts?: number;
    setCustomTaskRunEventFields?: jest.Mock;
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

    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RUN_TASK_TYPE]!.createTaskRunner(
      createRunContext({ workflowRunId, spaceId, attempts: 2, setCustomTaskRunEventFields })
    );

    await runner.run();

    expect(mockResolveInterruptedWorkflowRunTask).toHaveBeenCalled();
    expect(mockHandlePostExecutionLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowRunId,
        spaceId,
        fakeRequest: expect.anything(),
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

    const setCustomTaskRunEventFields = jest.fn();
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

    const setCustomTaskRunEventFields = jest.fn();
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

    const setCustomTaskRunEventFields = jest.fn();
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

    const setCustomTaskRunEventFields = jest.fn();
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

    const setCustomTaskRunEventFields = jest.fn();
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

    const setCustomTaskRunEventFields = jest.fn();
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
    const setCustomTaskRunEventFields = jest.fn();
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

    const setCustomTaskRunEventFields = jest.fn();
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
