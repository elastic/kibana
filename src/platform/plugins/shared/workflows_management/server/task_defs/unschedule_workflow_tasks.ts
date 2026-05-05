/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';

import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

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
