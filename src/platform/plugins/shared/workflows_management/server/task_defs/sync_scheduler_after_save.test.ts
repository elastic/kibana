/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflow } from '@kbn/workflows';

import { syncSchedulerAfterSave } from './sync_scheduler_after_save';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

const logger = loggerMock.create();

const mockTaskScheduler = {
  unscheduleWorkflowTasks: jest.fn().mockResolvedValue(undefined),
  updateWorkflowTasks: jest.fn().mockResolvedValue(undefined),
} as unknown as WorkflowTaskScheduler;

const baseWorkflow: EsWorkflow = {
  id: 'wf-1',
  name: 'Test',
  description: '',
  enabled: true,
  tags: [],
  yaml: 'name: Test',
  definition: {
    triggers: [{ type: 'scheduled', schedule: { interval: '5m' } }],
  } as any,
  createdBy: 'user1',
  lastUpdatedBy: 'user1',
  valid: true,
  deleted_at: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  lastUpdatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

const mockRequest = {} as any;

const makeGetWorkflow = (workflow: EsWorkflow | null) => jest.fn().mockResolvedValue(workflow);

describe('syncSchedulerAfterSave', () => {
  beforeEach(() => jest.clearAllMocks());

  it('re-reads the workflow from storage via getWorkflow', async () => {
    const getWorkflow = makeGetWorkflow(baseWorkflow);

    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      getWorkflow,
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default');
  });

  it('logs a warning and returns when the workflow disappears after save', async () => {
    const getWorkflow = makeGetWorkflow(null);

    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      getWorkflow,
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found after save'));
    expect(mockTaskScheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
    expect(mockTaskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
  });

  it('unschedules when workflow has no definition', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      getWorkflow: makeGetWorkflow({ ...baseWorkflow, definition: undefined }),
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
      getWorkflow: makeGetWorkflow({ ...baseWorkflow, valid: false }),
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
      getWorkflow: makeGetWorkflow({ ...baseWorkflow, enabled: false }),
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
      getWorkflow: makeGetWorkflow({
        ...baseWorkflow,
        definition: { triggers: [{ type: 'manual' }] } as any,
      }),
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
    expect(mockTaskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
  });

  it('updates tasks with the persisted workflow when schedulable', async () => {
    await syncSchedulerAfterSave({
      workflowId: 'wf-1',
      spaceId: 'default',
      request: mockRequest,
      getWorkflow: makeGetWorkflow(baseWorkflow),
      taskScheduler: mockTaskScheduler,
      logger,
    });

    expect(mockTaskScheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
    expect(mockTaskScheduler.updateWorkflowTasks).toHaveBeenCalledWith(
      baseWorkflow,
      'default',
      mockRequest
    );
  });
});
