/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflow, EsWorkflowTrigger } from '@kbn/workflows';
import { convertWorkflowScheduleToTaskSchedule, getScheduledTriggers } from '../lib/schedule_utils';

export interface WorkflowTaskSchedulerParams {
  workflowId: string;
  spaceId: string;
  schedule: { interval: string };
}

export class WorkflowTaskScheduler {
  constructor(
    private readonly logger: Logger,
    private readonly taskManager: TaskManagerStartContract
  ) {}

  /**
   * Schedules tasks for all enabled scheduled triggers in a workflow
   */
  async scheduleWorkflowTasks(workflow: EsWorkflow, spaceId: string): Promise<string[]> {
    const scheduledTriggers = getScheduledTriggers(workflow.triggers);
    const scheduledTaskIds: string[] = [];

    for (const trigger of scheduledTriggers) {
      try {
        const taskId = await this.scheduleWorkflowTask(workflow.id, spaceId, trigger);
        scheduledTaskIds.push(taskId);
        this.logger.info(`Scheduled workflow task for workflow ${workflow.id}, trigger ${trigger.id}, task ID: ${taskId}`);
      } catch (error) {
        this.logger.error(`Failed to schedule workflow task for workflow ${workflow.id}, trigger ${trigger.id}: ${error}`);
        throw error;
      }
    }

    return scheduledTaskIds;
  }

  /**
   * Schedules a single workflow task for a specific trigger
   */
  async scheduleWorkflowTask(
    workflowId: string,
    spaceId: string,
    trigger: EsWorkflowTrigger
  ): Promise<string> {
    const schedule = convertWorkflowScheduleToTaskSchedule(trigger);
    
    const taskInstance = {
      id: `workflow:${workflowId}:${trigger.id}`,
      taskType: 'workflow:scheduled',
      schedule,
      params: {
        workflowId,
        spaceId,
        triggerId: trigger.id,
      },
      state: {
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
      },
      scope: ['workflows'],
      enabled: true,
    };

    const scheduledTask = await this.taskManager.schedule(taskInstance);
    return scheduledTask.id;
  }

  /**
   * Unschedules all tasks for a workflow
   */
  async unscheduleWorkflowTasks(workflowId: string): Promise<void> {
    try {
      // Find all tasks for this workflow
      const tasks = await this.taskManager.fetch({
        query: {
          bool: {
            must: [
              { term: { 'task.taskType': 'workflow:scheduled' } },
              { term: { 'task.params.workflowId': workflowId } },
            ],
          },
        },
      });

      // Remove all tasks
      const taskIds = tasks.docs.map(task => task.id);
      if (taskIds.length > 0) {
        await this.taskManager.bulkRemove(taskIds);
        this.logger.info(`Unscheduled ${taskIds.length} tasks for workflow ${workflowId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to unschedule tasks for workflow ${workflowId}: ${error}`);
      throw error;
    }
  }

  /**
   * Updates scheduled tasks when a workflow is updated
   */
  async updateWorkflowTasks(workflow: EsWorkflow, spaceId: string): Promise<void> {
    // First, unschedule all existing tasks
    await this.unscheduleWorkflowTasks(workflow.id);
    
    // Then, schedule new tasks for enabled scheduled triggers
    await this.scheduleWorkflowTasks(workflow, spaceId);
  }
} 