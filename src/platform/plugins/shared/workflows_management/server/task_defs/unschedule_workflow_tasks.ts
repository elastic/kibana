/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';

/**
 * Unschedules tasks for deleted or disabled workflows.
 * Shared by soft delete, hard delete, and disableAllWorkflows.
 */
export const unscheduleWorkflowTasks = async (
  ids: string[],
  taskScheduler: WorkflowTaskScheduler | null
): Promise<void> => {
  if (!taskScheduler || ids.length === 0) {
    return;
  }

  await taskScheduler.bulkUnscheduleWorkflowTasks(ids);
};
