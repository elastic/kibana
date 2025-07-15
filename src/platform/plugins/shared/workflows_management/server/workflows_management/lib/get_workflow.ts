/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EsWorkflowSchema } from '@kbn/workflows/types/v1';

interface GetWorkflowParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflowId: string;
}

export const getWorkflow = async ({
  esClient,
  logger,
  workflowIndex,
  workflowId,
}: GetWorkflowParams) => {
  try {
    const response = await esClient.search<EsWorkflowSchema>({
      index: workflowIndex,
      query: {
        match: {
          _id: workflowId,
        },
      },
    });

    return transformToWorkflowModel(response);
  } catch (error) {
    logger.error(`Failed to get workflow: ${error}`);
    throw error;
  }
};

function transformToWorkflowModel(response: SearchResponse<EsWorkflowSchema>) {
  return (
    response.hits.hits.map((hit) => {
      const workflowSchema = hit._source!;
      return {
        id: hit._id,
        name: workflowSchema.name,
        description: workflowSchema.description,
        status: workflowSchema.status,
        triggers: workflowSchema.triggers,
        steps: workflowSchema.steps,
        nodes: workflowSchema.nodes,
      };
    })[0] ?? null
  );
}
