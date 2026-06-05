/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import {
  WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_ID,
  WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_TYPE,
} from './types';
import type { ExecutionIndexRolloverConditions } from '../lib/execution_indexes/rollover_execution_indexes';
import { rolloverWorkflowExecutionIndexes } from '../lib/execution_indexes/rollover_execution_indexes';
import type {
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from '../types';

export function registerExecutionIndexRolloverTask({
  taskManager,
  logger,
  core,
  getRolloverConditions,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<WorkflowsExecutionEnginePluginStartDeps, WorkflowsExecutionEnginePluginStart>;
  getRolloverConditions: () => ExecutionIndexRolloverConditions;
}): void {
  taskManager.registerTaskDefinitions({
    [WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_TYPE]: {
      title: 'Workflow execution index rollover',
      description: 'Rollovers workflow and step execution backing indexes.',
      timeout: '5m',
      maxAttempts: 1,
      createTaskRunner: ({ abortController }) => ({
        async run() {
          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const conditions = getRolloverConditions();

          await rolloverWorkflowExecutionIndexes({
            esClient,
            conditions,
            logger,
            signal: abortController.signal,
          });
        },
        async cancel() {
          abortController.abort();
        },
      }),
    },
  });
}

export async function scheduleExecutionIndexRolloverTask({
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
      id: WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_ID,
      taskType: WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_TYPE,
      state: {},
      params: {},
      schedule: { interval },
    });
  } catch (error) {
    logger.error(
      `Failed to schedule ${WORKFLOW_EXECUTION_INDEX_ROLLOVER_TASK_TYPE} task: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
