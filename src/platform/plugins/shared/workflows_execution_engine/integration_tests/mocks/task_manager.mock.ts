/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  ScheduleOptions,
  TaskInstanceWithDeprecatedFields,
} from '@kbn/task-manager-plugin/server/task';

export class TaskManagerMock implements Partial<TaskManagerStartContract> {
  public static create(): TaskManagerMock {
    const instance = new TaskManagerMock();
    jest.spyOn(instance, 'schedule');
    return instance;
  }

  public async schedule(
    taskInstance: TaskInstanceWithDeprecatedFields,
    options?: ScheduleOptions | undefined
  ): Promise<ConcreteTaskInstance> {
    const taskId = taskInstance.id ?? 'fake_task_id';

    return {
      id: taskId,
      taskType: taskInstance.taskType,
      params: taskInstance.params,
      state: taskInstance.state,
      attempts: 0,
      runAt: taskInstance.runAt ?? new Date(),
      scheduledAt: new Date(),
      startedAt: null,
    } as ConcreteTaskInstance;
  }
}
