/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_ID, WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_TYPE } from './types';

export function registerExecutionIndexCleanupTask({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}): void {
  taskManager.registerTaskDefinitions({
    [WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_TYPE]: {
      title: 'Workflow execution index cleanup',
      description:
        'Deletes workflow and step execution backing indexes where every execution is terminal.',
      timeout: '5m',
      maxAttempts: 1,
      createTaskRunner: ({ abortController }) => ({
        async run() {
          logger.debug('workflow:execution-index-cleanup task run (not implemented)');
        },
        async cancel() {
          abortController.abort();
        },
      }),
    },
  });
}

export async function scheduleExecutionIndexCleanupTask({
  taskManager,
  logger,
  interval,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  interval: string;
}): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_ID,
      taskType: WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_TYPE,
      state: {},
      params: {},
      schedule: { interval },
    });
  } catch (error) {
    logger.error(
      `Failed to schedule ${WORKFLOW_EXECUTION_INDEX_CLEANUP_TASK_TYPE} task: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
