/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { scheduleExecutionIndexCleanupTask } from './register_execution_index_cleanup_task';
import { scheduleExecutionIndexRolloverTask } from './register_execution_index_rollover_task';
import {
  WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_ID,
  WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_TYPE,
  WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_ID,
  WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_TYPE,
} from './types';
import {
  DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL,
  DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL,
} from '../config';

describe('execution index scheduled tasks', () => {
  const logger = { debug: jest.fn(), error: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules the rollover task with a recurring interval', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.ensureScheduled.mockResolvedValue({} as never);

    await scheduleExecutionIndexRolloverTask({
      taskManager,
      logger,
      interval: DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL,
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_ID,
      taskType: WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_TYPE,
      state: {},
      params: {},
      schedule: { interval: DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL },
    });
  });

  it('schedules the cleanup task with a recurring interval', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.ensureScheduled.mockResolvedValue({} as never);

    await scheduleExecutionIndexCleanupTask({
      taskManager,
      logger,
      interval: DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL,
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_ID,
      taskType: WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_TYPE,
      state: {},
      params: {},
      schedule: { interval: DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL },
    });
  });
});
