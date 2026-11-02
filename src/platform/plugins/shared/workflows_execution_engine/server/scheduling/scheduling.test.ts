/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { createBulkScheduleWorkflow, createScheduleWorkflow } from '.';
import type { SchedulingDeps } from '.';

const request = { headers: {} } as unknown as KibanaRequest;

const createWorkflow = (id: string): WorkflowExecutionEngineModel => ({
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
});

const createDeps = () => {
  const taskManager = { schedule: jest.fn(), bulkSchedule: jest.fn(), bulkGet: jest.fn() };
  const workflowExecutionRepository = {
    createWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    bulkCreateWorkflowExecutions: jest.fn(),
    bulkUpdateWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
    discardUnstartedExecution: jest.fn().mockResolvedValue(undefined),
    getWorkflowExecutionById: jest.fn().mockResolvedValue(null),
  };
  const workflowRepository = {
    getWorkflow: jest.fn().mockResolvedValue(null),
    getWorkflowExecutionStates: jest.fn().mockResolvedValue(new Map()),
    isWorkflowEnabled: jest.fn().mockResolvedValue(true),
    isWorkflowEnabledRealtime: jest.fn().mockResolvedValue(true),
    isManagedChildAdmissibleRealtime: jest.fn().mockResolvedValue(true),
  };
  const license = {
    isAvailable: true,
    isActive: true,
    hasAtLeast: jest.fn().mockReturnValue(true),
  };
  const getLicense = jest.fn().mockResolvedValue(license);
  const deps = {
    coreStart: {
      security: {
        authc: { getCurrentUser: jest.fn().mockReturnValue({ username: 'elastic' }) },
        audit: { asScoped: jest.fn().mockReturnValue({ log: jest.fn() }) },
        serviceAccounts: { isEnabled: jest.fn().mockReturnValue(false) },
      },
      userProfile: { getCurrentProfileId: jest.fn().mockResolvedValue('profile-id') },
      elasticsearch: { client: {} },
      http: { basePath: { publicBaseUrl: 'http://kibana.test' } },
    },
    licensing: { getLicense },
    taskManager,
    cloudSetup: undefined,
    config: { eventDriven: { maxChainDepth: 10 } },
    logger: loggerMock.create(),
    workflowRepository,
    workflowExecutionRepository,
    stepExecutionRepository: {},
    workflowTaskManager: {},
    concurrencyManager: undefined,
    getInternalResumeWorkflowExecution: () => undefined,
  };
  return {
    deps: deps as unknown as SchedulingDeps,
    taskManager,
    workflowExecutionRepository,
    workflowRepository,
    license,
    coreStart: deps.coreStart,
  };
};

describe('createScheduleWorkflow', () => {
  it('persists the execution and schedules a run task', async () => {
    const { deps, taskManager, workflowExecutionRepository } = createDeps();

    const result = await createScheduleWorkflow(deps)(createWorkflow('wf-1'), {}, request);

    expect(workflowExecutionRepository.createWorkflowExecution).toHaveBeenCalledTimes(1);
    const [execution] = workflowExecutionRepository.createWorkflowExecution.mock.calls[0];
    expect(execution).toEqual(
      expect.objectContaining({ workflowId: 'wf-1', spaceId: 'default', executedBy: 'elastic' })
    );
    expect(result).toEqual({ workflowExecutionId: execution.id });
    expect(taskManager.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: 'workflow:run',
        params: { workflowRunId: execution.id, spaceId: 'default' },
      }),
      { request, cloneApiKey: true }
    );
  });

  it('rejects when the license does not support workflows', async () => {
    const { deps, taskManager, license, workflowExecutionRepository } = createDeps();
    license.hasAtLeast.mockReturnValue(false);

    await expect(createScheduleWorkflow(deps)(createWorkflow('wf-1'), {}, request)).rejects.toThrow(
      'Your license does not support Workflows Execution Engine'
    );
    expect(workflowExecutionRepository.createWorkflowExecution).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('rejects when the user cannot execute a private workflow', async () => {
    const { deps, taskManager, workflowRepository } = createDeps();
    workflowRepository.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      access_control: { access_mode: 'private', entries: [] },
      owner_id: 'someone-else',
    });

    await expect(createScheduleWorkflow(deps)(createWorkflow('wf-1'), {}, request)).rejects.toThrow(
      'You do not have permission to execute this workflow.'
    );
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('marks the execution as failed when the task cannot be scheduled', async () => {
    const { deps, taskManager, workflowExecutionRepository } = createDeps();
    taskManager.schedule.mockRejectedValue(new Error('boom'));

    await expect(createScheduleWorkflow(deps)(createWorkflow('wf-1'), {}, request)).rejects.toThrow(
      'boom'
    );
    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
      expect.objectContaining({ status: ExecutionStatus.FAILED }),
    ]);
  });
});

describe('createBulkScheduleWorkflow', () => {
  it('returns an empty result for no items', async () => {
    const { deps } = createDeps();
    expect(await createBulkScheduleWorkflow(deps)([], request)).toEqual([]);
  });

  it('writes the executions in one bulk call and schedules their tasks', async () => {
    const { deps, taskManager, workflowExecutionRepository, workflowRepository } = createDeps();
    workflowRepository.getWorkflowExecutionStates.mockResolvedValue(
      new Map([
        ['default:wf-1', { enabled: true }],
        ['default:wf-2', { enabled: true }],
      ])
    );
    workflowExecutionRepository.bulkCreateWorkflowExecutions.mockImplementation(
      async (docs: unknown[]) => docs.map(() => ({}))
    );
    taskManager.bulkSchedule.mockImplementation(async (tasks: Array<{ id: string }>) => tasks);

    const results = await createBulkScheduleWorkflow(deps)(
      [
        { workflow: createWorkflow('wf-1'), context: {} },
        { workflow: createWorkflow('wf-2'), context: {} },
      ],
      request
    );

    expect(workflowExecutionRepository.bulkCreateWorkflowExecutions).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { status: 'scheduled', workflowExecutionId: expect.any(String) },
      { status: 'scheduled', workflowExecutionId: expect.any(String) },
    ]);
    expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkSchedule.mock.calls[0][0]).toHaveLength(2);
  });

  it('reports an access-denied error per item without scheduling it', async () => {
    const { deps, taskManager, workflowExecutionRepository, workflowRepository } = createDeps();
    workflowRepository.getWorkflowExecutionStates.mockResolvedValue(
      new Map([
        [
          'default:wf-1',
          { enabled: true, access_control: { access_mode: 'private', entries: [] } },
        ],
        ['default:wf-2', { enabled: true }],
      ])
    );
    workflowExecutionRepository.bulkCreateWorkflowExecutions.mockImplementation(
      async (docs: unknown[]) => docs.map(() => ({}))
    );
    taskManager.bulkSchedule.mockImplementation(async (tasks: Array<{ id: string }>) => tasks);

    const results = await createBulkScheduleWorkflow(deps)(
      [
        { workflow: createWorkflow('wf-1'), context: {} },
        { workflow: createWorkflow('wf-2'), context: {} },
      ],
      request
    );

    expect(results[0]).toEqual({
      status: 'error',
      error: { message: 'You do not have permission to execute this workflow.' },
    });
    expect(results[1]).toEqual({ status: 'scheduled', workflowExecutionId: expect.any(String) });
    expect(taskManager.bulkSchedule.mock.calls[0][0]).toHaveLength(1);
  });

  it('rejects when the license is not valid', async () => {
    const { deps, license } = createDeps();
    license.isActive = false;

    await expect(
      createBulkScheduleWorkflow(deps)([{ workflow: createWorkflow('wf-1'), context: {} }], request)
    ).rejects.toThrow('License information is not available or license is inactive.');
  });
});
