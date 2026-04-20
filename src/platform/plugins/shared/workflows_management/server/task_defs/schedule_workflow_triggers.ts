/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowYaml } from '@kbn/workflows';

import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

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
