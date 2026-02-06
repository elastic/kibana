/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';

interface SearchStepExecutionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
  additionalQuery?: estypes.QueryDslQueryContainer;
  spaceId: string;
}

export const searchStepExecutions = async ({
  esClient,
  logger,
  stepsExecutionIndex,
  workflowExecutionId,
  additionalQuery,
  spaceId,
}: SearchStepExecutionsParams): Promise<EsWorkflowStepExecution[]> => {
  try {
    logger.debug(`Searching workflows in index ${stepsExecutionIndex}`);

    const mustQueries: estypes.QueryDslQueryContainer[] = [
      { match: { workflowRunId: workflowExecutionId } },
      { term: { spaceId } },
    ];

    if (additionalQuery) {
      mustQueries.push(additionalQuery);
    }

    const response = await esClient.search<EsWorkflowStepExecution>({
      index: stepsExecutionIndex,
      query: {
        bool: {
          must: mustQueries,
        },
      },
      sort: 'startedAt:desc',
      from: 0,
      size: 1000, // TODO: without it, it returns up to 10 results by default. We should improve this.
    });

    logger.debug(
      `Found ${response.hits.hits.length} workflows, ${response.hits.hits.map((hit) => hit._id)}`
    );

    return (
      response.hits.hits
        .map((hit) => hit._source as EsWorkflowStepExecution)
        // TODO: It should be sorted on ES side
        // This sort is needed to ensure steps are returned in the execution order
        .sort((fst, scd) => fst.globalExecutionIndex - scd.globalExecutionIndex)
    );
  } catch (error) {
    logger.error(`Failed to search workflows: ${error}`);
    throw error;
  }
};
