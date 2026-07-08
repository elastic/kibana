/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '../../../types/v1';
import type { GetStepExecutionsByIdsOptions, StepExecutionsDataAccess } from '../types';

export interface GetStepExecutionsByWorkflowExecutionParams {
  stepExecutionsDal: StepExecutionsDataAccess;
  workflowExecutionId: string;
  stepExecutionIds?: string[];
  sourceExcludes?: GetStepExecutionsByIdsOptions['sourceExcludes'];
}

/**
 * Fetches all step executions for a workflow execution.
 * Uses mget (real-time, O(1)) when stepExecutionIds are available,
 * falls back to search for backward compatibility with older executions.
 */
export const getStepExecutionsByWorkflowExecution = async ({
  stepExecutionsDal,
  workflowExecutionId,
  stepExecutionIds,
  sourceExcludes,
}: GetStepExecutionsByWorkflowExecutionParams): Promise<EsWorkflowStepExecution[]> => {
  if (stepExecutionIds?.length) {
    return stepExecutionsDal.getByIds(stepExecutionIds, { sourceExcludes });
  }

  const response = await stepExecutionsDal.search({
    query: {
      match: { workflowRunId: workflowExecutionId },
    },
    ...(sourceExcludes?.length ? { _source: { excludes: sourceExcludes } } : {}),
    sort: 'startedAt:desc',
    size: 10000,
  });

  return response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
};
