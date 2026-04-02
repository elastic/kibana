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
import { isResponseError } from '@kbn/es-errors';
import type { EsWorkflowStepExecution } from '@kbn/workflows';

export interface StepExecutionListResult {
  results: EsWorkflowStepExecution[];
  total: number;
  page?: number;
  size?: number;
}

export interface SearchStepExecutionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  stepsExecutionIndex: string;
  /** When set, search steps for a single workflow run (existing behavior). */
  workflowExecutionId?: string;
  /** When set, search steps across all runs of a workflow. Use with optional stepId. */
  workflowId?: string;
  stepId?: string;
  additionalQuery?: estypes.QueryDslQueryContainer;
  spaceId: string;
  sourceExcludes?: string[];
  page?: number;
  size?: number;
}

function buildMustQueries(params: {
  workflowExecutionId?: string;
  workflowId?: string;
  stepId?: string;
  spaceId: string;
  additionalQuery?: estypes.QueryDslQueryContainer;
}): estypes.QueryDslQueryContainer[] {
  const mustQueries: estypes.QueryDslQueryContainer[] = [{ term: { spaceId: params.spaceId } }];
  if (params.workflowExecutionId !== undefined) {
    mustQueries.push({ term: { workflowRunId: params.workflowExecutionId } });
  }
  if (params.workflowId !== undefined) {
    mustQueries.push({ term: { workflowId: params.workflowId } });
  }
  if (params.stepId !== undefined) {
    mustQueries.push({ term: { stepId: params.stepId } });
  }
  if (params.additionalQuery) {
    mustQueries.push(params.additionalQuery);
  }
  return mustQueries;
}

function getTotalFromResponse(
  response: { hits: { total?: number | { value: number }; hits: unknown[] } },
  isPaginated: boolean,
  resultsLength: number
): number {
  if (!isPaginated) return resultsLength;
  const total = response.hits.total;
  return typeof total === 'number' ? total : (total as { value: number } | undefined)?.value ?? 0;
}

export const searchStepExecutions = async ({
  esClient,
  logger,
  stepsExecutionIndex,
  workflowExecutionId,
  workflowId,
  stepId,
  additionalQuery,
  spaceId,
  sourceExcludes,
  page,
  size,
}: SearchStepExecutionsParams): Promise<StepExecutionListResult> => {
  if (workflowExecutionId === undefined && workflowId === undefined) {
    throw new Error('Either workflowExecutionId or workflowId must be provided');
  }

  try {
    logger.debug(`Searching step executions in index ${stepsExecutionIndex}`);

    const mustQueries = buildMustQueries({
      workflowExecutionId,
      workflowId,
      stepId,
      spaceId,
      additionalQuery,
    });

    const isPaginated = workflowId !== undefined && (page !== undefined || size !== undefined);
    const pageSize = size ?? (isPaginated ? 100 : 1000);
    const from = isPaginated && page !== undefined ? (page - 1) * pageSize : 0;

    const response = await esClient.search<EsWorkflowStepExecution>({
      index: stepsExecutionIndex,
      query: { bool: { must: mustQueries } },
      ...(sourceExcludes?.length ? { _source: { excludes: sourceExcludes } } : {}),
      sort: 'startedAt:desc',
      from,
      size: pageSize,
      track_total_hits: isPaginated,
    });

    const results = response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);

    const total = getTotalFromResponse(response, isPaginated, results.length);
    logger.debug(`Found ${results.length} step executions`);

    return {
      results,
      total,
      ...(isPaginated && page !== undefined && { page, size: pageSize }),
    };
  } catch (error) {
    if (isResponseError(error) && error.body?.error?.type === 'index_not_found_exception') {
      return {
        results: [],
        total: 0,
        ...(page !== undefined && size !== undefined && { page, size }),
      };
    }
    logger.error(`Failed to search step executions: ${error}`);
    throw error;
  }
};
