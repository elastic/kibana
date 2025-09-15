/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ResumeWorkflowExecutionParams } from './types';

export class WorkflowTaskManager {
  constructor(private taskManager: TaskManagerStartContract) {}

  async scheduleResumeTask({
    runAt,
    workflowRunId,
    spaceId,
  }: {
    runAt: Date;
    workflowRunId: string;
    spaceId: string;
  }): Promise<{ taskId: string }> {
    const task = await this.taskManager.schedule({
      taskType: 'workflow:resume',
      params: {
        workflowRunId,
        spaceId,
      } as ResumeWorkflowExecutionParams,
      state: {},
      runAt,
    });
    return {
      taskId: task.id,
    };
  }
}
