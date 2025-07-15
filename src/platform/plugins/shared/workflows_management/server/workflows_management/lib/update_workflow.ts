/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WorkflowModel } from '@kbn/workflows';
import { getWorkflow } from './get_workflow';

interface UpdateWorkflowParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflowId: string;
  workflow: Partial<WorkflowModel>;
}

export const updateWorkflow = async ({
  esClient,
  logger,
  workflowIndex,
  workflowId,
  workflow,
}: UpdateWorkflowParams) => {
  const document = transformToUpdateScheme(workflow);

  try {
    const response = await esClient.update({
      id: workflowId,
      index: workflowIndex,
      doc: document,
      refresh: 'wait_for',
    });

    const createdWorkflow = await getWorkflow({
      esClient,
      logger,
      workflowIndex,
      workflowId: response._id,
    });

    return createdWorkflow;
  } catch (error) {
    logger.error(`Failed to update workflow: ${error}`);
    throw error;
  }
};

function transformToUpdateScheme(workflow: Partial<WorkflowModel>) {
  return {
    ...workflow,
  };
}
