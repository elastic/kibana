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
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ExecutionStatus, type WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowsExecutionEnginePlugin } from './plugin';

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
const mockCreateWorkflowExecution = jest.fn();
const mockBulkUpdateWorkflowExecutions = jest.fn();
jest.mock('./repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    bulkCreateWorkflowExecutions: mockBulkCreateWorkflowExecutions,
    createWorkflowExecution: mockCreateWorkflowExecution,
    bulkUpdateWorkflowExecutions: mockBulkUpdateWorkflowExecutions,
  })),
}));

const mockGetWorkflowExecutionStates = jest.fn();
jest.mock('@kbn/workflows', () => {
  const actual = jest.requireActual('@kbn/workflows');
  return {
    ...actual,
    WorkflowRepository: jest.fn().mockImplementation(() => ({
      getWorkflow: jest.fn().mockResolvedValue(undefined),
      getWorkflowExecutionStates: mockGetWorkflowExecutionStates,
      isWorkflowEnabled: jest.fn().mockResolvedValue(true),
    })),
  };
});

jest.mock('./concurrency/concurrency_manager', () => ({
  ConcurrencyManager: jest.fn().mockImplementation(() => ({
    checkConcurrency: jest.fn().mockResolvedValue(true),
    evaluateConcurrencyKey: jest.fn().mockReturnValue(null),
  })),
}));

const createWorkflow = (id: string): WorkflowExecutionEngineModel => ({
  id,
  name: `Workflow ${id}`,
  enabled: true,
  spaceId: 'default',
  definition: {
    name: `Workflow ${id}`,
    enabled: true,
    version: '1',
    triggers: [{ type: 'manual' }],
    steps: [],
  },
  yaml: `name: Workflow ${id}`,
  isTestRun: false,
});

const scheduleError = new Error('api key grant failed');

const failedUpdate = (id: string) => ({
  id,
  status: ExecutionStatus.FAILED,
  error: { type: 'TaskScheduleError', message: scheduleError.message },
  finishedAt: expect.any(String),
});

describe('task scheduling failure', () => {
  let initializerContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let pluginStart: Awaited<ReturnType<WorkflowsExecutionEnginePlugin['start']>>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  const request = {} as KibanaRequest;

  const createdExecutionId = (): string => mockCreateWorkflowExecution.mock.calls[0][0].id;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWorkflowExecution.mockResolvedValue(undefined);
    mockBulkUpdateWorkflowExecutions.mockResolvedValue(undefined);
    mockGetWorkflowExecutionStates.mockResolvedValue(new Map());

    initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      storage: { source: 'plain_index', dataRetention: '90d' },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    });
    const plugin = new WorkflowsExecutionEnginePlugin(initializerContext);
    plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    taskManager = taskManagerMock.createStart();
    taskManager.schedule.mockRejectedValue(scheduleError);
    taskManager.bulkSchedule.mockRejectedValue(scheduleError);
    pluginStart = plugin.start(coreMock.createStart(), {
      taskManager,
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });
  });

  it('marks the scheduleWorkflow execution FAILED and rethrows', async () => {
    await expect(
      pluginStart.scheduleWorkflow(createWorkflow('wf-alert'), { spaceId: 'default' }, request)
    ).rejects.toBe(scheduleError);

    expect(mockBulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
      failedUpdate(createdExecutionId()),
    ]);
  });

  it('marks the executeWorkflow execution FAILED and rethrows', async () => {
    await expect(
      pluginStart.executeWorkflow(createWorkflow('wf-manual'), { spaceId: 'default' }, request)
    ).rejects.toBe(scheduleError);

    expect(mockBulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
      failedUpdate(createdExecutionId()),
    ]);
  });

  it('marks the executeWorkflowStep execution FAILED and rethrows', async () => {
    await expect(
      pluginStart.executeWorkflowStep(createWorkflow('wf-step'), 'step-1', undefined, {}, request)
    ).rejects.toBe(scheduleError);

    expect(mockBulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
      failedUpdate(createdExecutionId()),
    ]);
  });

  it('marks every bulkScheduleWorkflow execution FAILED and rethrows', async () => {
    mockGetWorkflowExecutionStates.mockResolvedValue(
      new Map([
        ['default:wf-a', { enabled: true }],
        ['default:wf-b', { enabled: true }],
      ])
    );
    mockBulkCreateWorkflowExecutions.mockImplementation(async (executions: Array<{ id: string }>) =>
      executions.map(({ id }) => ({ id }))
    );

    await expect(
      pluginStart.bulkScheduleWorkflow(
        [
          { workflow: createWorkflow('wf-a'), context: { spaceId: 'default' } },
          { workflow: createWorkflow('wf-b'), context: { spaceId: 'default' } },
        ],
        request
      )
    ).rejects.toBe(scheduleError);

    const createdIds: string[] = mockBulkCreateWorkflowExecutions.mock.calls[0][0].map(
      ({ id }: { id: string }) => id
    );
    expect(mockBulkUpdateWorkflowExecutions).toHaveBeenCalledWith(createdIds.map(failedUpdate));
  });

  it('logs and still rethrows the schedule error when marking the execution FAILED also fails', async () => {
    mockBulkUpdateWorkflowExecutions.mockRejectedValue(new Error('es unavailable'));

    await expect(
      pluginStart.scheduleWorkflow(createWorkflow('wf-alert'), { spaceId: 'default' }, request)
    ).rejects.toBe(scheduleError);

    expect(initializerContext.logger.get().error).toHaveBeenCalledWith(
      expect.stringContaining(createdExecutionId())
    );
  });
});
