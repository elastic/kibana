/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';

import { syncSchedulerAfterSave } from './sync_scheduler_after_save';
import type { WorkflowProperties } from '../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

const logger = loggerMock.create();

const mockTaskScheduler = {
  unscheduleWorkflowTasks: jest.fn().mockResolvedValue(undefined),
  updateWorkflowTasks: jest.fn().mockResolvedValue(undefined),
} as unknown as WorkflowTaskScheduler;

const baseData: WorkflowProperties = {
  name: 'Test',
  description: '',
  enabled: true,
  tags: [],
  triggerTypes: ['scheduled'],
  yaml: 'name: Test',
  definition: {
    triggers: [{ type: 'scheduled', schedule: { interval: '5m' } }],
  } as any,
  createdBy: 'user1',
  lastUpdatedBy: 'user1',
  spaceId: 'default',
  valid: true,
  deleted_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const mockRequest = {} as any;

describe('syncSchedulerAfterSave', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unschedules when workflow has no definition', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      finalData: { ...baseData, definition: null },
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
    expect(mockTaskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
  });

  it('unschedules when workflow is invalid', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      finalData: { ...baseData, valid: false },
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
  });

  it('unschedules when workflow is disabled', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      finalData: { ...baseData, enabled: false },
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
  });

  it('unschedules when workflow has no scheduled triggers', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      finalData: {
        ...baseData,
        definition: { triggers: [{ type: 'manual' }] } as any,
      },
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
    expect(mockTaskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
  });

  it('updates tasks when workflow is schedulable with scheduled triggers', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      finalData: baseData,
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
    expect(mockTaskScheduler.updateWorkflowTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'wf-1',
        name: baseData.name,
        enabled: baseData.enabled,
        definition: baseData.definition,
        tags: baseData.tags,
        yaml: baseData.yaml,
        valid: baseData.valid,
        createdAt: new Date(baseData.created_at),
        lastUpdatedAt: new Date(baseData.updated_at),
      }),
      'default',
      mockRequest
    );
  });
});
