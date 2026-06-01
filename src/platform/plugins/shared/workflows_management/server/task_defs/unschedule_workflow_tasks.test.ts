/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unscheduleWorkflowTasks } from './unschedule_workflow_tasks';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

const makeMockScheduler = (): jest.Mocked<WorkflowTaskScheduler> =>
  ({
    bulkUnscheduleWorkflowTasks: jest.fn().mockResolvedValue(undefined),
    unscheduleWorkflowTasks: jest.fn().mockResolvedValue(undefined),
  } as any);

describe('unscheduleWorkflowTasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls bulkUnscheduleWorkflowTasks with all workflow IDs', async () => {
    const scheduler = makeMockScheduler();

    await unscheduleWorkflowTasks(['wf-1', 'wf-2', 'wf-3'], scheduler);

    expect(scheduler.bulkUnscheduleWorkflowTasks).toHaveBeenCalledTimes(1);
    expect(scheduler.bulkUnscheduleWorkflowTasks).toHaveBeenCalledWith(['wf-1', 'wf-2', 'wf-3']);
    expect(scheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
  });

  it('does nothing when taskScheduler is null', async () => {
    await unscheduleWorkflowTasks(['wf-1'], null);
  });

  it('does nothing when ids array is empty', async () => {
    const scheduler = makeMockScheduler();

    await unscheduleWorkflowTasks([], scheduler);

    expect(scheduler.bulkUnscheduleWorkflowTasks).not.toHaveBeenCalled();
  });
});
