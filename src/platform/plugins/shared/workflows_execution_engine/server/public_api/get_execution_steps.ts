/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, WorkflowStepExecutionListDto } from '@kbn/workflows';
import {
  ES_MAX_RESULT_WINDOW,
  WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE,
  WorkflowExecutionNotFoundError,
  WorkflowHistoryPaginationError,
} from '@kbn/workflows/common/errors';
import { searchSteps } from './search_steps';
import type { ExecutionReadDeps, ExecutionStepsPage, GetExecutionStepsParams } from './types';
import type {
  GetStepExecutionsByIdsOptions,
  GetWorkflowExecutionsByIdsOptions,
} from '../repositories/data_access_layer';

const PARENT_SOURCE_INCLUDES: Array<keyof EsWorkflowExecution> = [
  'spaceId',
  'managed',
  'stepExecutionIds',
];

const STEP_METADATA_SOURCE_EXCLUDES: NonNullable<GetStepExecutionsByIdsOptions['sourceExcludes']> =
  ['input', 'output'];

const emptyPage = (page: number, size: number, total = 0): WorkflowStepExecutionListDto => ({
  results: [],
  total,
  page,
  size,
});

/**
 * Returns one page of a run's steps, without input or output, in start order.
 * Throws `WorkflowExecutionNotFoundError` when the run is missing or in another space.
 * Throws `WorkflowHistoryPaginationError` when a legacy run is paged past the result window.
 * An empty page is a valid result when the requested slice is past the end of the step id list.
 */
export const getExecutionSteps = async (
  deps: ExecutionReadDeps,
  { executionId, spaceId, page, size }: GetExecutionStepsParams
): Promise<ExecutionStepsPage> => {
  const { items } = await deps.workflowExecutionsDataClient.getByIds([executionId], {
    sourceIncludes: PARENT_SOURCE_INCLUDES as GetWorkflowExecutionsByIdsOptions['sourceIncludes'],
  });
  const doc = items[0]?.document;
  if (!doc || doc.spaceId !== spaceId) {
    throw new WorkflowExecutionNotFoundError(executionId);
  }

  const stepExecutionIds = doc.stepExecutionIds;
  if (stepExecutionIds) {
    const total = stepExecutionIds.length;
    const ids = stepExecutionIds.slice((page - 1) * size, page * size);
    if (ids.length === 0) {
      return { managed: doc.managed, steps: emptyPage(page, size, total) };
    }
    const { items: stepItems } = await deps.stepExecutionsDataClient.getByIds(ids, {
      sourceExcludes: STEP_METADATA_SOURCE_EXCLUDES,
    });
    return {
      managed: doc.managed,
      steps: {
        results: stepItems.map(({ document }) => document),
        total,
        page,
        size,
      },
    };
  }

  const from = (page - 1) * size;
  if (from + size > ES_MAX_RESULT_WINDOW) {
    throw new WorkflowHistoryPaginationError(WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE);
  }

  return {
    managed: doc.managed,
    steps: await searchSteps(deps, {
      spaceId,
      executionId,
      includeInput: false,
      includeOutput: false,
      page,
      size,
      sort: 'startedAt:asc',
    }),
  };
};
