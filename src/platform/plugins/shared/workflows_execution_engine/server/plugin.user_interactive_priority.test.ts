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
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ExecutionStatus, type WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowsExecutionEnginePlugin } from './plugin';
import { getWorkflowWakeTaskId } from './workflow_task_manager/workflow_task_manager';

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
jest.mock('./lib/get_user', () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue('test-user'),
}));

const mockBulkCreateWorkflowExecutions = jest.fn();
const mockCreateWorkflowExecution = jest.fn().mockResolvedValue(undefined);
const mockGetWorkflowExecutionById = jest.fn();
const mockUpdateWorkflowExecution = jest.fn().mockResolvedValue(undefined);
jest.mock('./repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    bulkCreateWorkflowExecutions: mockBulkCreateWorkflowExecutions,
    createWorkflowExecution: mockCreateWorkflowExecution,
    getWorkflowExecutionById: mockGetWorkflowExecutionById,
    updateWorkflowExecution: mockUpdateWorkflowExecution,
  })),
}));

const mockAreWorkflowsEnabled = jest.fn();
const mockIsWorkflowEnabled = jest.fn().mockResolvedValue(true);
jest.mock('@kbn/workflows', () => {
  const actual = jest.requireActual('@kbn/workflows');
  return {
    ...actual,
    WorkflowRepository: jest.fn().mockImplementation(() => ({
      areWorkflowsEnabled: mockAreWorkflowsEnabled,
      isWorkflowEnabled: mockIsWorkflowEnabled,
    })),
  };
});

const mockConcurrencyCheckConcurrency = jest.fn();
jest.mock('./concurrency/concurrency_manager', () => ({
  ConcurrencyManager: jest.fn().mockImplementation(() => ({
    checkConcurrency: mockConcurrencyCheckConcurrency,
    evaluateConcurrencyKey: jest.fn().mockReturnValue(null),
  })),
}));

const createWorkflow = (
  id: string,
  overrides: Partial<WorkflowExecutionEngineModel> = {}
): WorkflowExecutionEngineModel => ({
  id,
  name: `Workflow ${id}`,
  enabled: true,
  definition: {
    name: `Workflow ${id}`,
    enabled: true,
    version: '1',
    triggers: [{ type: 'manual' }],
    steps: [],
  },
  yaml: `name: Workflow ${id}`,
  isTestRun: false,
  ...overrides,
});

const scheduledPriority = (
  taskManager: ReturnType<typeof taskManagerMock.createStart>,
  callIndex = 0
): unknown => taskManager.schedule.mock.calls[callIndex]?.[0]?.priority;

describe('user-interactive task priority', () => {
  let pluginStart: Awaited<ReturnType<WorkflowsExecutionEnginePlugin['start']>>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  const request = {} as KibanaRequest;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConcurrencyCheckConcurrency.mockResolvedValue(true);
    mockAreWorkflowsEnabled.mockResolvedValue(new Map<string, boolean>());
    mockIsWorkflowEnabled.mockResolvedValue(true);
    mockCreateWorkflowExecution.mockResolvedValue(undefined);
    mockUpdateWorkflowExecution.mockResolvedValue(undefined);

    const initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    });
    const plugin = new WorkflowsExecutionEnginePlugin(initializerContext);

    const coreSetup = coreMock.createSetup();
    plugin.setup(coreSetup as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    const coreStart = coreMock.createStart();
    taskManager = taskManagerMock.createStart();
    taskManager.schedule.mockResolvedValue({ id: 'scheduled-task' } as any);
    taskManager.ensureScheduled.mockResolvedValue({ id: 'scheduled-task' } as any);
    taskManager.runSoon.mockResolvedValue({ id: 'scheduled-task', conflict: false } as any);
    pluginStart = plugin.start(coreStart, {
      taskManager,
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });
  });

  describe('workflow:run', () => {
    it('schedules a user-interactive executeWorkflow at UserInteractive priority', async () => {
      await pluginStart.executeWorkflow(
        createWorkflow('wf-ui'),
        { spaceId: 'default', isUserInteractive: true },
        request
      );

      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      expect(scheduledPriority(taskManager)).toBe(TaskPriority.UserInteractive);
      expect(mockCreateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ isUserInteractive: true }),
        }),
        expect.anything()
      );
    });

    it('schedules executeWorkflow at Standard priority when the flag is omitted', async () => {
      await pluginStart.executeWorkflow(
        createWorkflow('wf-default'),
        { spaceId: 'default' },
        request
      );

      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      expect(scheduledPriority(taskManager)).toBe(TaskPriority.Standard);
    });

    it('schedules child workflow-step executions at Standard priority', async () => {
      await pluginStart.executeWorkflow(
        createWorkflow('wf-child'),
        { spaceId: 'default', triggeredBy: 'workflow-step' },
        request
      );

      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      expect(scheduledPriority(taskManager)).toBe(TaskPriority.Standard);
    });

    it('schedules alert scheduleWorkflow at Standard priority', async () => {
      await pluginStart.scheduleWorkflow(
        createWorkflow('wf-alert'),
        { spaceId: 'default' },
        request
      );

      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      expect(scheduledPriority(taskManager)).toBe(TaskPriority.Standard);
    });

    it('schedules bulkScheduleWorkflow at Standard priority', async () => {
      mockAreWorkflowsEnabled.mockResolvedValue(new Map([['default:wf-bulk', true]]));
      mockBulkCreateWorkflowExecutions.mockImplementation(
        async (executions: Array<{ id: string }>) => executions.map(({ id }) => ({ id }))
      );

      await pluginStart.bulkScheduleWorkflow(
        [{ workflow: createWorkflow('wf-bulk'), context: { spaceId: 'default' } }],
        request
      );

      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      const [scheduledTasks] = taskManager.bulkSchedule.mock.calls[0];
      expect(scheduledTasks).toHaveLength(1);
      expect(scheduledTasks[0].priority).toBe(TaskPriority.Standard);
    });

    it('schedules executeWorkflowStep at UserInteractive priority', async () => {
      await pluginStart.executeWorkflowStep(
        createWorkflow('wf-step', { spaceId: 'default' }),
        'step-1',
        undefined,
        {},
        request
      );

      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      expect(scheduledPriority(taskManager)).toBe(TaskPriority.UserInteractive);
    });
  });

  describe('workflow:resume', () => {
    const waitingExecution = {
      id: 'exec-hitl',
      spaceId: 'default',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      context: {},
    };

    it('schedules HITL resume at UserInteractive priority when a request is present', async () => {
      mockGetWorkflowExecutionById.mockResolvedValue(waitingExecution);

      await pluginStart.resumeWorkflowExecution(
        'exec-hitl',
        'default',
        { approved: true },
        request
      );

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'workflow:resume',
          priority: TaskPriority.UserInteractive,
        }),
        expect.objectContaining({ request, cloneApiKey: true })
      );
      expect(taskManager.runSoon).toHaveBeenCalled();
    });

    it('does not schedule a UserInteractive resume when HITL has no request', async () => {
      mockGetWorkflowExecutionById.mockResolvedValue(waitingExecution);

      await pluginStart.resumeWorkflowExecution('exec-hitl', 'default', { approved: true });

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
      expect(taskManager.runSoon).toHaveBeenCalledWith(getWorkflowWakeTaskId('exec-hitl'));
    });
  });
});
