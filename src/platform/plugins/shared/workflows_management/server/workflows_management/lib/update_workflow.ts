/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EsWorkflow } from '@kbn/workflows';
import { getWorkflow } from './get_workflow';
import { hasScheduledTriggers } from '../../lib/schedule_utils';

interface UpdateWorkflowParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflowId: string;
  workflow: Partial<EsWorkflow>;
  taskScheduler?: any; // Will be properly typed when we integrate it
  spaceId?: string;
}

export const updateWorkflow = async ({
  esClient,
  logger,
  workflowIndex,
  workflowId,
  workflow,
  taskScheduler,
  spaceId = 'default',
}: UpdateWorkflowParams) => {
  const document = transformToUpdateScheme(workflow);

  try {
    const response = await esClient.update({
      id: workflowId,
      index: workflowIndex,
      doc: { ...document, updatedAt: new Date(), updatedBy: esClient.info.toString() },
      refresh: 'wait_for',
    });

    const updatedWorkflow = await getWorkflow({
      esClient,
      logger,
      workflowIndex,
      workflowId: response._id,
    });

    // Update scheduled tasks if the workflow has scheduled triggers
    if (taskScheduler && updatedWorkflow && hasScheduledTriggers(updatedWorkflow.triggers)) {
      try {
        await taskScheduler.updateWorkflowTasks(updatedWorkflow, spaceId);
        logger.info(`Updated scheduled tasks for workflow ${workflowId}`);
      } catch (taskError) {
        logger.error(`Failed to update scheduled tasks for workflow ${workflowId}: ${taskError}`);
        // Don't fail the workflow update if task scheduling fails
        // The workflow can still be updated and tasks can be scheduled later
      }
    } else if (taskScheduler && updatedWorkflow) {
      // If the workflow no longer has scheduled triggers, unschedule existing tasks
      try {
        await taskScheduler.unscheduleWorkflowTasks(workflowId);
        logger.info(`Unscheduled tasks for workflow ${workflowId} (no scheduled triggers)`);
      } catch (taskError) {
        logger.error(`Failed to unschedule tasks for workflow ${workflowId}: ${taskError}`);
        // Don't fail the workflow update if task unscheduling fails
      }
    }

    return updatedWorkflow;
  } catch (error) {
    logger.error(`Failed to update workflow: ${error}`);
    throw error;
  }
};

function transformToUpdateScheme(workflow: Partial<EsWorkflow>) {
  return {
    ...workflow,
  };
}
