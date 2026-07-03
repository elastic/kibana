/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { WORKFLOWS_EXECUTIONS_DS, WORKFLOWS_STEP_EXECUTIONS_DS } from '@kbn/workflows';
import { initializeStepExecutionsClient } from '../../repositories/step_executions_data_stream';
import { initializeWorkflowExecutionsClient } from '../../repositories/workflow_executions_data_stream';
import type {
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from '../../types';
import {
  WORKFLOW_MIGRATION_TASK_ID,
  WORKFLOW_MIGRATION_TASK_TYPE,
} from '../../workflow_task_manager/types';

export const initMigrationTask = (
  coreSetup: CoreSetup<
    WorkflowsExecutionEnginePluginStartDeps,
    WorkflowsExecutionEnginePluginStart
  >,
  plugins: WorkflowsExecutionEnginePluginSetupDeps
) => {
  plugins.taskManager.registerTaskDefinitions({
    [WORKFLOW_MIGRATION_TASK_TYPE]: {
      title: 'Migrate Workflow Executions',
      description:
        'Migrates terminal workflow & step executions from the mutable execution state index into the append-only execution history data streams.',
      timeout: '10m',
      // One-shot semantics per scheduled run: on transient failure the recurring
      // schedule retries on the next interval rather than re-running immediately.
      maxAttempts: 1,
      createTaskRunner: ({ abortController }) => {
        return {
          run: async () => {
            const [coreStart] = await coreSetup.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;

            // Ensure the data streams are initialized before the migration starts
            await initializeWorkflowExecutionsClient(coreStart.dataStreams);
            await initializeStepExecutionsClient(coreStart.dataStreams);

            const migrations = [
              {
                sourceIndex: '.workflows-executions',
                destIndex: WORKFLOWS_EXECUTIONS_DS,
              },
              {
                sourceIndex: '.workflows-step-executions',
                destIndex: WORKFLOWS_STEP_EXECUTIONS_DS,
              },
            ];

            const results: unknown[] = [];

            for (const { sourceIndex, destIndex } of migrations) {
              try {
                const indexExists = await esClient.indices.exists({
                  index: sourceIndex,
                });

                if (indexExists) {
                  const asyncReindex = await esClient.reindex({
                    wait_for_completion: false,
                    conflicts: 'proceed',
                    source: {
                      index: sourceIndex,
                      size: 3,
                    },
                    dest: {
                      op_type: 'create',
                      index: destIndex,
                    },
                    script: {
                      lang: 'painless',
                      source: `
                          ctx._id = ctx._source.id;
                          if (ctx._source.createdAt == null) {
                            ctx._source['@timestamp'] = ctx._source.startedAt;
                            return;
                          }
                          ctx._source['@timestamp'] = ctx._source.createdAt;
                        `,
                    },
                  });

                  while (!abortController.signal.aborted) {
                    const task = await esClient.tasks.get({
                      task_id: asyncReindex.task as string,
                    });

                    if (task.completed) {
                      results.push(task);
                      break;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000));
                  }
                }
              } catch (error) {
                results.push({ error: error.message });
              }
            }

            await Promise.all(
              migrations.map(({ sourceIndex }) =>
                esClient.indices.putMapping({ index: sourceIndex, _meta: { migrated: true } })
              )
            );

            return { state: {} };
          },
        };
      },
    },
  });
};

export const scheduleMigrationTask = async (
  plugins: WorkflowsExecutionEnginePluginStartDeps,
  logger: Logger
) => {
  void plugins.taskManager
    .ensureScheduled({
      id: `${WORKFLOW_MIGRATION_TASK_ID}v1`, // TODO: REMOVE THIS IN PROD
      taskType: WORKFLOW_MIGRATION_TASK_TYPE,
      params: {},
      state: {},
    })
    .catch((error: unknown) => {
      logger.warn(
        `Failed to schedule workflow executions migration task: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};
