/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { CreateWorkflowCommand, EsWorkflow, WorkflowStatus } from '@kbn/workflows';
import { v4 as uuidv4 } from 'uuid';
import { getWorkflow } from './get_workflow';
import { hasScheduledTriggers } from '../../lib/schedule_utils';

interface CreateWorkflowParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflow: CreateWorkflowCommand;
  taskScheduler?: any; // Will be properly typed when we integrate it
  spaceId?: string;
}

export const createWorkflow = async ({
  esClient,
  logger,
  workflowIndex,
  workflow,
  taskScheduler,
  spaceId = 'default',
}: CreateWorkflowParams) => {
  const workflowId = uuidv4();
  const document = transformToCreateScheme(workflow);

  try {
    const response = await esClient.create({
      id: workflowId,
      index: workflowIndex,
      document,
      refresh: 'wait_for',
    });

    const createdWorkflow = await getWorkflow({
      esClient,
      logger,
      workflowIndex,
      workflowId: response._id,
    });

    // Schedule tasks if the workflow has scheduled triggers
    if (taskScheduler && hasScheduledTriggers(workflow.triggers)) {
      try {
        await taskScheduler.scheduleWorkflowTasks(createdWorkflow, spaceId);
        logger.info(`Scheduled tasks for workflow ${workflowId}`);
      } catch (taskError) {
        logger.error(`Failed to schedule tasks for workflow ${workflowId}: ${taskError}`);
        // Don't fail the workflow creation if task scheduling fails
        // The workflow can still be created and tasks can be scheduled later
      }
    }

    return createdWorkflow;
  } catch (error) {
    logger.error(`Failed to create workflow: ${error}`);
    throw error;
  }
};

function transformToCreateScheme(workflow: CreateWorkflowCommand): Omit<EsWorkflow, 'id'> {
  return {
    name: workflow.name,
    description: workflow.description || '',
    status: workflow.status || WorkflowStatus.DRAFT,
    triggers: workflow.triggers || [],
    steps: workflow.steps || [],
    tags: [],
    yaml: workflow.yaml,
    createdAt: new Date(),
    createdBy: 'system',
    lastUpdatedAt: new Date(),
    lastUpdatedBy: 'system',
  };
}
