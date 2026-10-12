/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { isIndexNotFoundError } from './lib/query';
import type { ExecutionReadDeps, GetWaitingStepIdParams } from './types';

/**
 * Returns the id of the step currently blocking a run on input, including a step already claimed.
 * `spaceId` must match the run. Returns `null` when the run is missing, in another space, or has
 * no open `waitForInput` or `waitForApproval` step. A missing index returns `null`.
 */
export const getWaitingStepId = async (
  deps: ExecutionReadDeps,
  { executionId, spaceId }: GetWaitingStepIdParams
): Promise<string | null> => {
  try {
    const { items } = await deps.workflowExecutionsDataClient.getByIds([executionId], {
      sourceIncludes: ['spaceId', 'stepExecutionIds'],
    });
    const execution = items[0]?.document;
    if (!execution || execution.spaceId !== spaceId) return null;
    if (execution.stepExecutionIds?.length) {
      const { items: steps } = await deps.stepExecutionsDataClient.getByIds(
        execution.stepExecutionIds,
        { sourceIncludes: ['id', 'spaceId', 'workflowRunId', 'stepType', 'status', 'finishedAt'] }
      );
      return (
        steps.findLast(
          ({ document: step }) =>
            step.spaceId === spaceId &&
            step.workflowRunId === executionId &&
            (step.stepType === 'waitForInput' || step.stepType === 'waitForApproval') &&
            step.status === 'waiting_for_input' &&
            !step.finishedAt
        )?.document.id ?? null
      );
    }
    const response = (await deps.stepExecutionsDataClient.search({
      query: {
        bool: {
          must: [
            { term: { workflowRunId: executionId } },
            { term: { spaceId } },
            { terms: { stepType: ['waitForInput', 'waitForApproval'] } },
            { term: { status: 'waiting_for_input' } },
          ],
          must_not: [{ exists: { field: 'finishedAt' } }],
        },
      },
      _source: ['id'],
      sort: [{ startedAt: { order: 'desc' } }],
      size: 1,
      track_total_hits: false,
    })) as estypes.SearchResponse<EsWorkflowStepExecution>;
    const hit = response.hits.hits[0];
    return hit?._source?.id ?? hit?._id ?? null;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return null;
    }
    deps.logger.warn(
      `Failed to resolve the waiting step execution for ${executionId} in space ${spaceId}: ${error}`
    );
    throw error;
  }
};
