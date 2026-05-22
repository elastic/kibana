/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowYaml } from '@kbn/workflows';

import { scheduleWorkflowTriggers } from './schedule_workflow_triggers';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

const logger = loggerMock.create();
const mockRequest = {} as any;

const makeMockScheduler = (): jest.Mocked<WorkflowTaskScheduler> =>
  ({
    scheduleWorkflowTask: jest.fn().mockResolvedValue('task-1'),
  } as any);

const baseDefinition: WorkflowYaml = {
  triggers: [{ type: 'scheduled', with: { every: '5m' } }, { type: 'manual' }],
  steps: [],
  name: 'Test',
  enabled: true,
  version: '1',
};

describe('scheduleWorkflowTriggers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules only triggers with type "scheduled"', async () => {
    const scheduler = makeMockScheduler();

    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition: baseDefinition,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: scheduler,
      logger,
    });

    expect(scheduler.scheduleWorkflowTask).toHaveBeenCalledTimes(1);
    expect(scheduler.scheduleWorkflowTask).toHaveBeenCalledWith(
      'wf-1',
      'default',
      expect.objectContaining({ type: 'scheduled' }),
      mockRequest
    );
  });

  it('does nothing when taskScheduler is null', async () => {
    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition: baseDefinition,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: null,
      logger,
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does nothing when definition is undefined', async () => {
    const scheduler = makeMockScheduler();

    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition: undefined,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: scheduler,
      logger,
    });

    expect(scheduler.scheduleWorkflowTask).not.toHaveBeenCalled();
  });

  it('does nothing when definition has no triggers', async () => {
    const scheduler = makeMockScheduler();

    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition: { ...baseDefinition, triggers: undefined } as any,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: scheduler,
      logger,
    });

    expect(scheduler.scheduleWorkflowTask).not.toHaveBeenCalled();
  });

  it('logs warning but does not throw when a trigger scheduling fails', async () => {
    const scheduler = makeMockScheduler();
    scheduler.scheduleWorkflowTask.mockRejectedValueOnce(new Error('task manager down'));

    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition: baseDefinition,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: scheduler,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to schedule trigger for workflow wf-1')
    );
  });

  it('schedules multiple scheduled triggers in parallel', async () => {
    const scheduler = makeMockScheduler();
    const definition: WorkflowYaml = {
      ...baseDefinition,
      triggers: [
        { type: 'scheduled', with: { every: '5m' } },
        { type: 'scheduled', with: { every: '1h' } },
      ],
    };

    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: scheduler,
      logger,
    });

    expect(scheduler.scheduleWorkflowTask).toHaveBeenCalledTimes(2);
  });

  it('continues scheduling remaining triggers when one fails', async () => {
    const scheduler = makeMockScheduler();
    scheduler.scheduleWorkflowTask
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce('task-2');
    const definition: WorkflowYaml = {
      ...baseDefinition,
      triggers: [
        { type: 'scheduled', with: { every: '5m' } },
        { type: 'scheduled', with: { every: '1h' } },
      ],
    };

    await scheduleWorkflowTriggers({
      workflowId: 'wf-1',
      definition,
      spaceId: 'default',
      request: mockRequest,
      taskScheduler: scheduler,
      logger,
    });

    expect(scheduler.scheduleWorkflowTask).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
