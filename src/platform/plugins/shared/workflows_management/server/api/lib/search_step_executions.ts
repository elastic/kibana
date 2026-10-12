/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionsDataClient } from '@kbn/workflows-execution-engine/server';
import { searchSteps } from '@kbn/workflows-execution-engine/server';

export interface StepExecutionListResult {
  results: EsWorkflowStepExecution[];
  total: number;
  page?: number;
  size?: number;
}

export interface SearchStepExecutionsParams {
  stepExecutionsDataClient: StepExecutionsDataClient;
  logger: Logger;
  /** When set, search steps for a single workflow run (existing behavior). */
  workflowExecutionId?: string;
  /** When set, search steps across all runs of a workflow. Use with optional stepId. */
  workflowId?: string;
  stepId?: string;
  /** When set, only step executions of this type, e.g. `ai.agent`. */
  stepType?: string;
  additionalQuery?: estypes.QueryDslQueryContainer;
  spaceId: string;
  sourceExcludes?: string[];
  /**
   * When set, only these `_source` paths are returned. Takes precedence over `sourceExcludes`,
   * for callers that need a couple of fields off documents whose `output` can be megabytes.
   */
  sourceIncludes?: string[];
  page?: number;
  size?: number;
  /**
   * Defaults to newest-first for workflow-level search. Single-run lists
   * (execution detail) pass `startedAt:asc` so page 1 matches mget of `stepExecutionIds`.
   */
  sort?: 'startedAt:asc' | 'startedAt:desc';
  /** Datemath lower bound for filtering by startedAt. */
  startedAfter?: string;
  /** Datemath upper bound for filtering by startedAt. */
  startedBefore?: string;
}

export const searchStepExecutions = async ({
  stepExecutionsDataClient,
  logger,
  workflowExecutionId,
  workflowId,
  stepId,
  stepType,
  additionalQuery,
  spaceId,
  sourceExcludes,
  sourceIncludes,
  page,
  size,
  sort = 'startedAt:desc',
  startedAfter,
  startedBefore,
}: SearchStepExecutionsParams): Promise<StepExecutionListResult> => {
  if (workflowExecutionId === undefined && workflowId === undefined) {
    throw new Error('Either workflowExecutionId or workflowId must be provided');
  }

  const pageResult = await searchSteps(
    {
      logger,
      workflowExecutionsDataClient: undefined as never,
      stepExecutionsDataClient,
    },
    {
      spaceId,
      executionId: workflowExecutionId,
      workflowId,
      stepId,
      stepType,
      startedAfter,
      startedBefore,
      includeFields: sourceIncludes,
      includeInput: sourceExcludes?.includes('input') ? false : undefined,
      includeOutput: sourceExcludes?.includes('output') ? false : undefined,
      page,
      size,
      sort,
    }
  );

  if (additionalQuery) {
    throw new Error('additionalQuery is no longer applied by searchStepExecutions');
  }

  return pageResult;
};
