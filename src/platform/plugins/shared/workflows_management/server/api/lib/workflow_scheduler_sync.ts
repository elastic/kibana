/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflow, WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';

import { hasScheduledTriggers } from '../../lib/schedule_utils';
import type { WorkflowProperties } from '../../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../../tasks/workflow_task_scheduler';

/**
 * Schedules trigger tasks for a newly created workflow.
 * Used by both createWorkflow and bulkCreateWorkflows.
 */
export const scheduleWorkflowTriggers = async (params: {
  workflowId: string;
  definition: WorkflowYaml | undefined;
  spaceId: string;
  request: KibanaRequest;
  taskScheduler: WorkflowTaskScheduler | null;
  logger: Logger;
}): Promise<void> => {
  const { workflowId, definition, spaceId, request, taskScheduler, logger } = params;
  if (!taskScheduler || !definition?.triggers) {
    return;
  }

  const scheduledTriggers = definition.triggers.filter((t) => t.type === 'scheduled');
  const results = await Promise.allSettled(
    scheduledTriggers.map((trigger) =>
      taskScheduler.scheduleWorkflowTask(workflowId, spaceId, trigger, request)
    )
  );
  results.forEach((result) => {
    if (result.status === 'rejected') {
      logger.warn(`Failed to schedule trigger for workflow ${workflowId}: ${result.reason}`);
    }
  });
};

/**
 * Syncs scheduler state after a workflow document is saved (update path).
 * Unschedules tasks if the workflow is not schedulable, or updates them otherwise.
 */
export const syncSchedulerAfterSave = async (params: {
  workflowId: string;
  spaceId: string;
  request: KibanaRequest;
  finalData: WorkflowProperties;
  taskScheduler: WorkflowTaskScheduler;
  logger: Logger;
  getWorkflow: (id: string, sp: string) => Promise<WorkflowDetailDto | null>;
}): Promise<void> => {
  const { workflowId, spaceId, request, finalData, taskScheduler, logger, getWorkflow } = params;

  const workflowIsSchedulable = finalData.definition && finalData.valid && finalData.enabled;
  if (!workflowIsSchedulable) {
    await taskScheduler.unscheduleWorkflowTasks(workflowId);
    logger.debug(
      `Removed all scheduled tasks for workflow ${workflowId} (workflow disabled or invalid)`
    );
    return;
  }

  const triggers = finalData.definition?.triggers ?? [];
  if (!hasScheduledTriggers(triggers)) {
    await taskScheduler.unscheduleWorkflowTasks(workflowId);
    logger.debug(`Removed scheduled tasks for workflow ${workflowId} (no scheduled triggers)`);
    return;
  }

  const updatedWorkflow = await getWorkflow(workflowId, spaceId);
  if (!updatedWorkflow?.definition) return;

  const workflowForScheduler: EsWorkflow = {
    ...updatedWorkflow,
    definition: updatedWorkflow.definition,
    tags: [],
    deleted_at: null,
    createdAt: new Date(updatedWorkflow.createdAt),
    lastUpdatedAt: new Date(updatedWorkflow.lastUpdatedAt),
  };
  await taskScheduler.updateWorkflowTasks(workflowForScheduler, spaceId, request);
  logger.debug(`Updated scheduled tasks for workflow ${workflowId}`);
};

/**
 * Unschedules tasks for deleted or disabled workflows.
 * Shared by soft delete, hard delete, and disableAllWorkflows.
 */
export const unscheduleWorkflowTasks = async (
  ids: string[],
  taskScheduler: WorkflowTaskScheduler | null,
  logger: Logger
): Promise<void> => {
  if (!taskScheduler || ids.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    ids.map((workflowId) => taskScheduler.unscheduleWorkflowTasks(workflowId))
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      logger.warn(`Failed to unschedule tasks for deleted workflow ${ids[i]}: ${result.reason}`);
    }
  });
};
