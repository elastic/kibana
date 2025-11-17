/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TaskManagerStartContract, TaskStatus } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { ResumeWorkflowExecutionParams } from './types';
import { generateExecutionTaskScope } from '../utils';

export class WorkflowTaskManager {
  constructor(private taskManager: TaskManagerStartContract) {}

  async scheduleResumeTask({
    workflowExecution,
    resumeAt,
  }: {
    workflowExecution: EsWorkflowExecution;
    resumeAt: Date;
  }): Promise<{ taskId: string }> {
    const task = await this.taskManager.schedule({
      taskType: 'workflow:resume',
      params: {
        workflowRunId: workflowExecution.id,
        spaceId: workflowExecution.spaceId,
      } as ResumeWorkflowExecutionParams,
      state: {},
      runAt: resumeAt,
      scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
    });

    return {
      taskId: task.id,
    };
  }

  async forceRunIdleTasks(workflowExecutionId: string): Promise<void> {
    const { docs: idleTasks } = await this.taskManager.fetch({
      query: {
        bool: {
          must: [
            {
              term: {
                'task.status': TaskStatus.Idle,
              },
            },
            {
              term: {
                'task.scope': `workflow:execution:${workflowExecutionId}`,
              },
            },
          ],
        },
      },
    });

    if (idleTasks.length) {
      await Promise.all(idleTasks.map((idleTask) => this.taskManager.runSoon(idleTask.id)));
    }
  }
}
