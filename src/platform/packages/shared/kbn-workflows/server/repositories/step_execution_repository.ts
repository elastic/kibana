/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '../../types/v1';

/**
 * Fetches step executions by their IDs using mget (O(1) operation).
 * This is real-time (reads from translog) and doesn't require index refresh.
 */
export const getStepExecutionsByIds = async (
  esClient: ElasticsearchClient,
  stepsExecutionIndex: string,
  stepExecutionIds: string[],
  sourceExcludes?: string[]
): Promise<EsWorkflowStepExecution[]> => {
  if (stepExecutionIds.length === 0) {
    return [];
  }

  const mgetResponse = await esClient.mget<EsWorkflowStepExecution>({
    index: stepsExecutionIndex,
    ids: stepExecutionIds,
    ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
  });

  const steps: EsWorkflowStepExecution[] = [];
  for (const doc of mgetResponse.docs) {
    if ('found' in doc && doc.found && doc._source) {
      steps.push(doc._source);
    }
  }
  return steps;
};

interface GetStepExecutionsByWorkflowExecutionParams {
  esClient: ElasticsearchClient;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
  stepExecutionIds?: string[];
  sourceExcludes?: string[];
}

/**
 * Fetches all step executions for a workflow execution.
 * Uses mget (real-time, O(1)) when stepExecutionIds are available,
 * falls back to search for backward compatibility with older executions.
 */
export const getStepExecutionsByWorkflowExecution = async ({
  esClient,
  stepsExecutionIndex,
  workflowExecutionId,
  stepExecutionIds,
  sourceExcludes,
}: GetStepExecutionsByWorkflowExecutionParams): Promise<EsWorkflowStepExecution[]> => {
  if (stepExecutionIds && stepExecutionIds.length > 0) {
    return getStepExecutionsByIds(esClient, stepsExecutionIndex, stepExecutionIds, sourceExcludes);
  }

  const response = await esClient.search<EsWorkflowStepExecution>({
    index: stepsExecutionIndex,
    query: {
      match: { workflowRunId: workflowExecutionId },
    },
    ...(sourceExcludes?.length ? { _source: { excludes: sourceExcludes } } : {}),
    sort: 'startedAt:desc',
    size: 10000,
  });

  return response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
};
