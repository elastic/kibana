/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';

interface SearchStepExecutionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
  spaceId: string;
}

export const searchStepExecutions = async ({
  esClient,
  logger,
  stepsExecutionIndex,
  workflowExecutionId,
  spaceId,
}: SearchStepExecutionsParams): Promise<EsWorkflowStepExecution[]> => {
  try {
    logger.info(`Searching workflows in index ${stepsExecutionIndex}`);
    const response = await esClient.search<EsWorkflowStepExecution>({
      index: stepsExecutionIndex,
      query: {
        bool: {
          must: [
            { match: { workflowRunId: workflowExecutionId } },
            {
              bool: {
                should: [
                  { term: { spaceId } },
                  // Backward compatibility for objects without spaceId
                  { bool: { must_not: { exists: { field: 'spaceId' } } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      sort: 'startedAt:desc',
    });

    logger.info(
      `Found ${response.hits.hits.length} workflows, ${response.hits.hits.map((hit) => hit._id)}`
    );

    return (
      response.hits.hits
        .map((hit) => hit._source as EsWorkflowStepExecution)
        // TODO: It should be sorted on ES side
        // This sort is needed to ensure steps are returned in the execution order
        .sort((fst, scd) => fst.topologicalIndex - scd.topologicalIndex)
    );
  } catch (error) {
    logger.error(`Failed to search workflows: ${error}`);
    throw error;
  }
};
