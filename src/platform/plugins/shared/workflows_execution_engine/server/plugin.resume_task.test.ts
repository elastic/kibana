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
import { TaskAlreadyRunningError, TaskPriority, TaskStatus } from '@kbn/task-manager-plugin/server';
import type { ConcreteTaskInstance, TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

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

const mockResolveInterruptedWorkflowResumeTask = jest.fn();
const mockResolveExhaustedWorkflowRunTask = jest.fn().mockResolvedValue(undefined);
const mockFailExecutionMissingIdentity = jest.fn().mockResolvedValue(undefined);
jest.mock('./lib/task_recovery', () => {
  const actual = jest.requireActual('./lib/task_recovery');
  return {
    ...actual,
    resolveInterruptedWorkflowResumeTask: (...args: unknown[]) =>
      mockResolveInterruptedWorkflowResumeTask(...args),
    resolveExhaustedWorkflowRunTask: (...args: unknown[]) =>
      mockResolveExhaustedWorkflowRunTask(...args),
    failExecutionMissingIdentity: (...args: unknown[]) => mockFailExecutionMissingIdentity(...args),
  };
});

const mockHandlePostExecutionLoop = jest.fn().mockResolvedValue(undefined);
jest.mock('./execution_functions/handle_post_execution_loop', () => ({
  handlePostExecutionLoop: (...args: unknown[]) => mockHandlePostExecutionLoop(...args),
}));

const mockResumeWorkflow = jest.fn();
jest.mock('./execution_functions', () => {
  const actual = jest.requireActual('./execution_functions');
  return {
    ...actual,
    resumeWorkflow: (...args: unknown[]) => mockResumeWorkflow(...args),
  };
});

const mockGetWorkflowExecutionById = jest.fn();
jest.mock('./repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    getWorkflowExecutionById: mockGetWorkflowExecutionById,
  })),
}));

import { WorkflowsExecutionEnginePlugin } from './plugin';
import { WORKFLOW_RESUME_TASK_TYPE } from './workflow_task_manager/types';
import {
  getWorkflowGlobalTimeoutResumeTaskId,
  getWorkflowImmediateResumeTaskId,
  getWorkflowWakeTaskId,
} from './workflow_task_manager/workflow_task_manager';

describe('workflow:resume task runner event fields', () => {
  let taskDefinitions: Record<string, TaskRegisterDefinition>;
  let taskManagerStart: ReturnType<typeof taskManagerMock.createStart>;

  const setupPlugin = () => {
    taskDefinitions = {};
    const initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    });
    const plugin = new WorkflowsExecutionEnginePlugin(initializerContext);
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    taskManagerStart = taskManagerMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([
      coreStart,
      {
        taskManager: taskManagerStart,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveInterruptedWorkflowResumeTask.mockResolvedValue({ action: 'resume_workflow' });
    mockResolveExhaustedWorkflowRunTask.mockResolvedValue(undefined);
    mockFailExecutionMissingIdentity.mockResolvedValue(undefined);
    mockResumeWorkflow.mockResolvedValue({});
    mockGetWorkflowExecutionById.mockResolvedValue(null);
  });

  it('defers an immediate resume while the initial execution is still running', async () => {
    setupPlugin();
    mockGetWorkflowExecutionById.mockResolvedValue({ status: 'running' });
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE].createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          ...taskManagerMock.createTask(),
          id: getWorkflowImmediateResumeTaskId('exec-initial'),
          params: { workflowRunId: 'exec-initial', spaceId: 'default' },
          attempts: 1,
        },
        fakeRequest: {} as KibanaRequest,
      })
    );
    expect(await runner.run()).toEqual({ runAt: expect.any(Date), state: {} });
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
    expect(mockResolveInterruptedWorkflowResumeTask).not.toHaveBeenCalled();
  });

  it('lets interrupted resume claims reach recovery even when execution is running', async () => {
    setupPlugin();
    mockGetWorkflowExecutionById.mockResolvedValue({ status: 'running' });
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE].createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          ...taskManagerMock.createTask(),
          id: getWorkflowImmediateResumeTaskId('exec-interrupted'),
          params: { workflowRunId: 'exec-interrupted', spaceId: 'default' },
          attempts: 2,
        },
        fakeRequest: {} as KibanaRequest,
      })
    );
    await runner.run();
    expect(mockResolveInterruptedWorkflowResumeTask).toHaveBeenCalledWith(
      expect.objectContaining({ workflowRunId: 'exec-interrupted', taskAttempts: 2 })
    );
  });

  it('retains the stable wake task after dispatch and deletes it only after terminal state', async () => {
    setupPlugin();
    mockGetWorkflowExecutionById.mockResolvedValue({ status: 'waiting_for_input' });
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE].createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          ...taskManagerMock.createTask(),
          id: getWorkflowWakeTaskId('retained'),
          params: { workflowRunId: 'retained', spaceId: 'default' },
        },
        fakeRequest: {} as KibanaRequest,
      })
    );
    // A new caller may ensure this same task while the current dispatch finishes.
    expect(await runner.run()).toEqual({
      runAt: expect.any(Date),
      state: {},
      priority: TaskPriority.Standard,
    });
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
    taskManagerStart.runSoon.mockRejectedValueOnce(new TaskAlreadyRunningError('runner'));
    expect(await runner.run()).toEqual({
      runAt: expect.any(Date),
      state: {},
      priority: TaskPriority.Standard,
    });
    mockGetWorkflowExecutionById.mockResolvedValue({ status: 'completed' });
    expect(await runner.run()).toBeUndefined();
  });

  it('retains interactive priority through a busy handoff and resets it after consumption', async () => {
    setupPlugin();
    mockGetWorkflowExecutionById.mockResolvedValue({
      status: 'waiting_for_input',
      context: { pendingInteractiveResume: true, resumeInput: { approved: true } },
    });
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE].createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          ...taskManagerMock.createTask(),
          id: getWorkflowWakeTaskId('interactive'),
          params: { workflowRunId: 'interactive', spaceId: 'default' },
          priority: TaskPriority.UserInteractive,
        },
        fakeRequest: {} as KibanaRequest,
      })
    );
    taskManagerStart.runSoon.mockRejectedValueOnce(new TaskAlreadyRunningError('runner'));
    expect(await runner.run()).toMatchObject({ priority: TaskPriority.UserInteractive });
    expect(await runner.run()).toMatchObject({ priority: TaskPriority.UserInteractive });
    expect(taskManagerStart.runSoon).toHaveBeenLastCalledWith(
      getWorkflowImmediateResumeTaskId('interactive'),
      { priority: TaskPriority.UserInteractive }
    );

    mockGetWorkflowExecutionById.mockResolvedValue({
      status: 'waiting',
      context: { pendingInteractiveResume: false, resumeInput: null, isUserInteractive: true },
    });
    expect(await runner.run()).toMatchObject({ priority: TaskPriority.Standard });
    expect(taskManagerStart.runSoon).toHaveBeenLastCalledWith(
      getWorkflowImmediateResumeTaskId('interactive')
    );
  });

  it('dispatches a timeout task through the same immediate runner', async () => {
    setupPlugin();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE].createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          ...taskManagerMock.createTask(),
          id: getWorkflowGlobalTimeoutResumeTaskId('exec-timer'),
          params: { workflowRunId: 'exec-timer', spaceId: 'default' },
        },
        fakeRequest: {} as KibanaRequest,
      })
    );
    await runner.run();
    expect(taskManagerStart.runSoon).toHaveBeenCalledWith(
      getWorkflowImmediateResumeTaskId('exec-timer')
    );
    expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: getWorkflowWakeTaskId('exec-timer') }),
      expect.objectContaining({ cloneApiKey: true })
    );
    expect(taskManagerStart.ensureScheduled.mock.invocationCallOrder[0]).toBeLessThan(
      taskManagerStart.runSoon.mock.invocationCallOrder[0]
    );
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
  });

  it('retries a busy notification without entering workflow recovery or executing steps', async () => {
    setupPlugin();
    taskManagerStart.runSoon.mockRejectedValueOnce(new TaskAlreadyRunningError('active'));
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE].createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          ...taskManagerMock.createTask(),
          params: { workflowRunId: 'exec-notify', spaceId: 'default' },
          attempts: 2,
        },
        fakeRequest: {} as KibanaRequest,
      })
    );
    expect(await runner.run()).toEqual({ runAt: expect.any(Date), state: {} });
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
    expect(mockResolveInterruptedWorkflowResumeTask).not.toHaveBeenCalled();
    taskManagerStart.runSoon.mockResolvedValue({ id: 'active', forced: false });
    expect(await runner.run()).toBeUndefined();
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
  });

  it('does not stamp semantic outcome when an early wake-up defers to the wait deadline', async () => {
    setupPlugin();

    const workflowRunId = 'exec-rearm';
    const spaceId = 'default';
    const idleTimeoutResumeAt = new Date('2024-01-01T11:00:00Z');
    mockResumeWorkflow.mockResolvedValue({ retryAt: idleTimeoutResumeAt });

    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
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
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    const result = await runner.run();

    expect(result).toEqual({ runAt: idleTimeoutResumeAt, state: {} });
    expect(setCustomTaskRunEventFields).not.toHaveBeenCalled();
  });

  it('stamps interrupted when resume interrupt recovery returns task_complete', async () => {
    setupPlugin();
    const workflowRunId = 'exec-interrupted-resume';
    const workflowId = 'wf-interrupted-resume';
    const spaceId = 'default';
    mockResolveInterruptedWorkflowResumeTask.mockResolvedValue({
      action: 'task_complete',
      reason: 'interrupted',
      execution: {
        id: workflowRunId,
        workflowId,
        spaceId,
        status: 'failed',
      },
    });
    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId, spaceId },
          state: {},
          attempts: 2,
          runAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T09:55:00Z'),
          startedAt: new Date('2024-01-01T10:00:00Z'),
          retryAt: null,
          status: TaskStatus.Running,
          ownerId: 'kibana-instance-id',
        } as ConcreteTaskInstance,
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(mockResumeWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'interrupted',
    });
  });

  it('stamps completed when resume interrupt recovery noop is terminal', async () => {
    setupPlugin();
    const workflowRunId = 'exec-resume-noop';
    const workflowId = 'wf-resume-noop';
    mockResolveInterruptedWorkflowResumeTask.mockResolvedValue({
      action: 'task_complete',
      reason: 'noop',
      execution: {
        id: workflowRunId,
        workflowId,
        spaceId: 'default',
        status: 'completed',
      },
    });
    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId, spaceId: 'default' },
          state: {},
          attempts: 2,
          runAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T09:55:00Z'),
          startedAt: new Date('2024-01-01T10:00:00Z'),
          retryAt: null,
          status: TaskStatus.Running,
          ownerId: 'kibana-instance-id',
        } as ConcreteTaskInstance,
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'completed',
    });
  });

  it('stamps completed on happy-path resume', async () => {
    setupPlugin();
    const workflowRunId = 'exec-resume-done';
    const workflowId = 'wf-resume-done';
    mockResumeWorkflow.mockResolvedValue({});
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: 'completed',
    });
    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId, spaceId: 'default' },
          state: {},
          attempts: 1,
          runAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T09:55:00Z'),
          startedAt: new Date('2024-01-01T10:00:00Z'),
          retryAt: null,
          status: TaskStatus.Running,
          ownerId: 'kibana-instance-id',
        } as ConcreteTaskInstance,
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await runner.run();

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'completed',
    });
  });

  it('stamps failed when resumeWorkflow throws before max attempts', async () => {
    setupPlugin();
    const workflowRunId = 'exec-resume-failed';
    const workflowId = 'wf-resume-failed';
    mockResumeWorkflow.mockRejectedValue(new Error('boom'));
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: 'failed',
    });
    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId, spaceId: 'default' },
          state: {},
          attempts: 1,
          runAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T09:55:00Z'),
          startedAt: new Date('2024-01-01T10:00:00Z'),
          retryAt: null,
          status: TaskStatus.Running,
          ownerId: 'kibana-instance-id',
        } as ConcreteTaskInstance,
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await expect(runner.run()).rejects.toThrow('boom');
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'failed',
    });
  });

  it('stamps interrupted when resumeWorkflow throws at max attempts', async () => {
    setupPlugin();
    const workflowRunId = 'exec-resume-exhausted';
    const workflowId = 'wf-resume-exhausted';
    mockResumeWorkflow.mockRejectedValue(new Error('exhausted'));
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId: 'default',
      status: 'failed',
    });
    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId, spaceId: 'default' },
          state: {},
          attempts: 3,
          runAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T09:55:00Z'),
          startedAt: new Date('2024-01-01T10:00:00Z'),
          retryAt: null,
          status: TaskStatus.Running,
          ownerId: 'kibana-instance-id',
        } as ConcreteTaskInstance,
        fakeRequest: {} as KibanaRequest,
        setCustomTaskRunEventFields,
      })
    );

    await expect(runner.run()).rejects.toThrow('exhausted');
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: 'default',
      outcome: 'interrupted',
    });
  });

  it('fails the execution when claimed without a Task Manager identity', async () => {
    setupPlugin();
    const workflowRunId = 'exec-no-identity-resume';
    const workflowId = 'wf-no-identity-resume';
    const spaceId = 'default';
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId,
      spaceId,
      status: 'failed',
    });

    const setCustomTaskRunEventFields = jest.fn();
    const runner = taskDefinitions[WORKFLOW_RESUME_TASK_TYPE]!.createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: {
          id: getWorkflowImmediateResumeTaskId(workflowRunId),
          taskType: WORKFLOW_RESUME_TASK_TYPE,
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
    expect(mockResumeWorkflow).not.toHaveBeenCalled();
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: workflowRunId,
      workflow_id: workflowId,
      space_id: spaceId,
      outcome: 'failed',
    });
  });
});
