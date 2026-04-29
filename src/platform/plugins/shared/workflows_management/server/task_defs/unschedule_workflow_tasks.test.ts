/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';

import { unscheduleWorkflowTasks } from './unschedule_workflow_tasks';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

const logger = loggerMock.create();

const makeMockScheduler = (): jest.Mocked<WorkflowTaskScheduler> =>
  ({
    unscheduleWorkflowTasks: jest.fn().mockResolvedValue(undefined),
  } as any);

describe('unscheduleWorkflowTasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls unscheduleWorkflowTasks for each workflow ID', async () => {
    const scheduler = makeMockScheduler();

    await unscheduleWorkflowTasks(['wf-1', 'wf-2', 'wf-3'], scheduler, logger);

    expect(scheduler.unscheduleWorkflowTasks).toHaveBeenCalledTimes(3);
    expect(scheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
    expect(scheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-2');
    expect(scheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-3');
  });

  it('does nothing when taskScheduler is null', async () => {
    await unscheduleWorkflowTasks(['wf-1'], null, logger);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does nothing when ids array is empty', async () => {
    const scheduler = makeMockScheduler();

    await unscheduleWorkflowTasks([], scheduler, logger);

    expect(scheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
  });

  it('logs warning but does not throw when an unschedule fails', async () => {
    const scheduler = makeMockScheduler();
    scheduler.unscheduleWorkflowTasks.mockRejectedValueOnce(new Error('task not found'));

    await unscheduleWorkflowTasks(['wf-1'], scheduler, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to unschedule tasks for deleted workflow wf-1')
    );
  });

  it('continues unscheduling remaining workflows when one fails', async () => {
    const scheduler = makeMockScheduler();
    scheduler.unscheduleWorkflowTasks
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('third failed'));

    await unscheduleWorkflowTasks(['wf-1', 'wf-2', 'wf-3'], scheduler, logger);

    expect(scheduler.unscheduleWorkflowTasks).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('wf-1'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('wf-3'));
  });
});
