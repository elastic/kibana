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
import type { ExecutionReadDeps, GetStepParams } from './types';

/**
 * Returns one step execution addressed by its run and step id.
 * `spaceId` must match. A missing step, a step in another space, or a missing index returns `null`.
 */
export const getStep = async (
  deps: ExecutionReadDeps,
  { executionId, stepExecutionId, spaceId }: GetStepParams
): Promise<EsWorkflowStepExecution | null> => {
  try {
    const response = (await deps.stepExecutionsDataClient.search({
      query: {
        bool: {
          must: [
            { term: { workflowRunId: executionId } },
            { term: { id: stepExecutionId } },
            { term: { spaceId } },
          ],
        },
      },
      size: 1,
      track_total_hits: false,
    })) as estypes.SearchResponse<EsWorkflowStepExecution>;
    return response.hits.hits[0]?._source ?? null;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return null;
    }
    throw error;
  }
};
