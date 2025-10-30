/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { getReadableFrequency, getReadableInterval } from '../lib/rrule_logging_utils';
import type { WorkflowTrigger } from '../lib/schedule_utils';
import {
  calculateNextRunTime,
  convertWorkflowScheduleToTaskSchedule,
  getScheduledTriggers,
} from '../lib/schedule_utils';

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
   * Schedules tasks for all scheduled triggers in a workflow
   */
  async scheduleWorkflowTasks(
    workflow: EsWorkflow,
    spaceId: string,
    request?: KibanaRequest
  ): Promise<string[]> {
    const scheduledTriggers = getScheduledTriggers(workflow.definition.triggers);
    const scheduledTaskIds: string[] = [];

    for (const trigger of scheduledTriggers) {
      try {
        const taskId = await this.scheduleWorkflowTask(workflow, spaceId, trigger, request);
        scheduledTaskIds.push(taskId);
        this.logger.info(
          `Scheduled workflow task for workflow ${workflow.id}, trigger ${trigger.type}, task ID: ${taskId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to schedule workflow task for workflow ${workflow.id}, trigger ${trigger.type}: ${error}`
        );
        throw error;
      }
    }

    return scheduledTaskIds;
  }

  /**
   * Schedules a single workflow task for a specific trigger
   */
  async scheduleWorkflowTask(
    workflow: EsWorkflow,
    spaceId: string,
    trigger: WorkflowTrigger,
    request?: KibanaRequest
  ): Promise<string> {
    // First validate the trigger configuration by converting it
    // This will throw the appropriate validation errors
    convertWorkflowScheduleToTaskSchedule(trigger);

    // Calculate next run time for one-time task
    const nextRunTime = calculateNextRunTime(trigger);
    if (!nextRunTime) {
      throw new Error(`Could not calculate next run time for workflow ${workflow.id} trigger`);
    }

    // Log RRule-specific scheduling details
    if (trigger.with && 'rrule' in trigger.with && trigger.with.rrule) {
      const freqText = getReadableFrequency(trigger.with.rrule.freq);
      const intervalText = getReadableInterval(
        trigger.with.rrule.freq,
        trigger.with.rrule.interval
      );

      this.logger.info(
        `RRule schedule created for workflow ${workflow.id}: ${freqText} every ${
          trigger.with.rrule.interval
        } ${intervalText}, next run at ${nextRunTime.toISOString()}`
      );
    } else {
      this.logger.info(
        `Interval schedule created for workflow ${
          workflow.id
        }, next run at ${nextRunTime.toISOString()}`
      );
    }

    // Convert workflow to execution model format
    const workflowExecutionModel: WorkflowExecutionEngineModel = {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition,
      yaml: workflow.yaml,
    };

    // Use non-unique task ID for this workflow and trigger
    const taskInstance = {
      id: `workflow:${workflow.id}:scheduled`,
      taskType: 'workflow:scheduled',
      runAt: nextRunTime,
      params: {
        workflow: workflowExecutionModel,
        spaceId,
        triggerType: trigger.type,
        trigger, // Store the original trigger for next run calculation
      },
      state: {
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
      },
      scope: ['workflows', workflow.id], // Include workflowId for queryability
      enabled: true,
    };

    // Use ensureScheduled which will update existing task if it exists
    // Use Task Manager's first-class API key support by passing the request
    // Task Manager will automatically create and manage the API key for user context
    const scheduledTask = request
      ? await this.taskManager.ensureScheduled(taskInstance, { request })
      : await this.taskManager.ensureScheduled(taskInstance);

    return scheduledTask.id;
  }

  /**
   * Unschedules all tasks for a workflow
   */
  async unscheduleWorkflowTasks(workflowId: string): Promise<void> {
    try {
      // Find all tasks for this workflow using scope-based query
      const tasks = await this.taskManager.fetch({
        query: {
          bool: {
            must: [
              { term: { 'task.taskType': 'workflow:scheduled' } },
              { term: { 'task.scope': workflowId } },
            ],
          },
        },
      });
      // Remove all tasks
      const taskIds = tasks.docs.map((task) => task.id);
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
  async updateWorkflowTasks(
    workflow: EsWorkflow,
    spaceId: string,
    request?: KibanaRequest
  ): Promise<void> {
    // Check if there are any running executions for this workflow
    const hasRunningExecutions = await this.hasWaitingExecutions(workflow.id);

    if (hasRunningExecutions) {
      this.logger.info(
        `Skipping scheduled task update for workflow ${workflow.id} - workflow has running executions`
      );
      return;
    }

    // First, unschedule all existing tasks
    await this.unscheduleWorkflowTasks(workflow.id);

    // Then, schedule new tasks for scheduled triggers
    await this.scheduleWorkflowTasks(workflow, spaceId, request);
  }

  /**
   * Check if there are any running executions for a workflow
   */
  private async hasWaitingExecutions(workflowId: string): Promise<boolean> {
    try {
      const response = await this.taskManager.fetch({
        query: {
          bool: {
            must: [
              { term: { 'task.taskType': 'workflow:resume' } },
              { term: { 'task.scope': workflowId } },
            ],
          },
        },
        size: 1,
      });

      // If there are any resume tasks, there are running executions
      return response.docs.length > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check for running executions for workflow ${workflowId}: ${error}`
      );
      return true;
    }
  }
}
