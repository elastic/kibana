/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';

import { hasScheduledTriggers } from '../lib/schedule_utils';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

/**
 * Syncs scheduler state after a workflow document is saved (update path).
 * Re-reads the workflow from storage via `getWorkflow` so the scheduler is always
 * programmed against the last persisted state. Under concurrent writes this
 * guarantees the scheduler reflects the latest committed document, not an
 * in-memory copy that may have been superseded.
 */
export const syncSchedulerAfterSave = async (params: {
  workflowId: string;
  spaceId: string;
  request: KibanaRequest;
  getWorkflow: (id: string, spaceId: string) => Promise<EsWorkflow | null>;
  taskScheduler: WorkflowTaskScheduler;
  logger: Logger;
}): Promise<void> => {
  const { workflowId, spaceId, request, getWorkflow, taskScheduler, logger } = params;

  const workflow = await getWorkflow(workflowId, spaceId);
  if (!workflow) {
    logger.warn(`syncSchedulerAfterSave: workflow ${workflowId} not found after save`);
    return;
  }

  const schedulable = workflow.definition && workflow.valid && workflow.enabled;
  if (!schedulable) {
    await taskScheduler.unscheduleWorkflowTasks(workflowId);
    logger.debug(
      `Removed all scheduled tasks for workflow ${workflowId} (workflow disabled or invalid)`
    );
    return;
  }

  if (!hasScheduledTriggers(workflow.definition?.triggers ?? [])) {
    await taskScheduler.unscheduleWorkflowTasks(workflowId);
    logger.debug(`Removed scheduled tasks for workflow ${workflowId} (no scheduled triggers)`);
    return;
  }

  await taskScheduler.updateWorkflowTasks(workflow, spaceId, request);
  logger.debug(`Updated scheduled tasks for workflow ${workflowId}`);
};
