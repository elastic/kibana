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
import type { WorkflowProperties } from '../storage/workflow_storage';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

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
}): Promise<void> => {
  const { workflowId, spaceId, request, finalData, taskScheduler, logger } = params;

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

  const workflowForScheduler: EsWorkflow = {
    id: workflowId,
    name: finalData.name,
    description: finalData.description,
    enabled: finalData.enabled,
    tags: finalData.tags,
    yaml: finalData.yaml,
    definition: finalData.definition ?? undefined,
    createdBy: finalData.createdBy,
    lastUpdatedBy: finalData.lastUpdatedBy,
    valid: finalData.valid,
    deleted_at: finalData.deleted_at,
    createdAt: new Date(finalData.created_at),
    lastUpdatedAt: new Date(finalData.updated_at),
  };
  await taskScheduler.updateWorkflowTasks(workflowForScheduler, spaceId, request);
  logger.debug(`Updated scheduled tasks for workflow ${workflowId}`);
};
