/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { GetStepExecutionsByIdsOptions, StepExecutionsDataClient } from '../types';

const DEFAULT_SEARCH_SIZE = 10_000;

export interface GetStepExecutionsByWorkflowExecutionParams {
  stepExecutionsDataClient: StepExecutionsDataClient;
  workflowExecutionId: string;
  stepExecutionIds?: string[];
  sourceExcludes?: GetStepExecutionsByIdsOptions['sourceExcludes'];
  /** Caps mget ids and the legacy search `size`. Search defaults to 10_000. */
  maxSteps?: number;
}

/**
 * Fetches all step executions for a workflow execution.
 * Uses mget (real-time, O(1)) when stepExecutionIds are available,
 * falls back to search for backward compatibility with older executions.
 */
export const getStepExecutionsByWorkflowExecution = async ({
  stepExecutionsDataClient,
  workflowExecutionId,
  stepExecutionIds,
  sourceExcludes,
  maxSteps,
}: GetStepExecutionsByWorkflowExecutionParams): Promise<EsWorkflowStepExecution[]> => {
  if (stepExecutionIds?.length) {
    const ids = maxSteps != null ? stepExecutionIds.slice(0, maxSteps) : stepExecutionIds;
    const { items } = await stepExecutionsDataClient.getByIds(ids, { sourceExcludes });
    return items.map(({ document }) => document);
  }

  const response = await stepExecutionsDataClient.search({
    query: {
      match: { workflowRunId: workflowExecutionId },
    },
    ...(sourceExcludes?.length ? { _source: { excludes: sourceExcludes } } : {}),
    sort: 'startedAt:desc',
    size: maxSteps ?? DEFAULT_SEARCH_SIZE,
  });

  return response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
};
