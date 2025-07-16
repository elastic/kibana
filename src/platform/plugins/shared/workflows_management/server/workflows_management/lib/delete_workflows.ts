/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

interface DeleteWorkflowsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflowIds: string[];
  taskScheduler?: any; // Will be properly typed when we integrate it
}

export const deleteWorkflows = async ({
  esClient,
  logger,
  workflowIndex,
  workflowIds,
  taskScheduler,
}: DeleteWorkflowsParams) => {
  try {
    // Unschedule tasks for all workflows being deleted
    if (taskScheduler) {
      for (const workflowId of workflowIds) {
        try {
          await taskScheduler.unscheduleWorkflowTasks(workflowId);
          logger.info(`Unscheduled tasks for deleted workflow ${workflowId}`);
        } catch (taskError) {
          logger.error(`Failed to unschedule tasks for deleted workflow ${workflowId}: ${taskError}`);
          // Don't fail the deletion if task unscheduling fails
        }
      }
    }

    const response = await esClient.deleteByQuery({
      index: workflowIndex,
      query: {
        ids: {
          values: workflowIds,
        },
      },
      refresh: true,
    });

    return response;
  } catch (error) {
    logger.error(`Failed to delete workflows: ${error}`);
    throw error;
  }
};
