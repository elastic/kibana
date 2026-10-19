/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, WorkflowStepExecutionListDto } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { StepExecutionListResult } from './search_step_executions';
import {
  ES_MAX_RESULT_WINDOW,
  WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE,
  WorkflowHistoryPaginationError,
} from '../../lib/workflow_history_pagination_error';

const PARENT_SOURCE_INCLUDES = ['spaceId', 'managed', 'stepExecutionIds'] as const;

const STEP_METADATA_SOURCE_EXCLUDES = ['input', 'output'] as const;

export interface GetExecutionStepExecutionsParams {
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  workflowExecutionId: string;
  spaceId: string;
  page: number;
  size: number;
}

export interface GetExecutionStepExecutionsResult {
  workflowExecution: EsWorkflowExecution;
  stepExecutionListResult: StepExecutionListResult;
}

const emptyPage = (page: number, size: number, total = 0): WorkflowStepExecutionListDto => ({
  results: [],
  total,
  page,
  size,
});

const toResult = (
  workflowExecution: EsWorkflowExecution,
  stepExecutionListResult: StepExecutionListResult
): GetExecutionStepExecutionsResult => ({
  workflowExecution,
  stepExecutionListResult,
});

/**
 * Lists step executions for a single workflow run, without input or output.
 * Uses `_mget` by `stepExecutionIds` when present; falls back to search for legacy docs.
 * Both paths return start order (id-list order / `startedAt:asc`) so page 1 is the beginning of the run.
 */
export const getExecutionStepExecutions = async ({
  workflowsExecutionEngine,
  workflowExecutionId,
  spaceId,
  page,
  size,
}: GetExecutionStepExecutionsParams): Promise<GetExecutionStepExecutionsResult> => {
  const executions = await workflowsExecutionEngine.getWorkflowExecutionsById({
    ids: [workflowExecutionId],
    spaceId,
    sourceIncludes: PARENT_SOURCE_INCLUDES,
  });
  const doc = executions[0];
  if (!doc) {
    throw new WorkflowExecutionNotFoundError(`Workflow execution ${workflowExecutionId} not found`);
  }

  const stepExecutionIds = doc.stepExecutionIds;
  if (stepExecutionIds) {
    const total = stepExecutionIds.length;
    const ids = stepExecutionIds.slice((page - 1) * size, page * size);
    if (ids.length === 0) {
      return toResult(doc, emptyPage(page, size, total));
    }

    const stepItems = await workflowsExecutionEngine.getStepExecutionsByIds({
      ids,
      spaceId,
      sourceExcludes: STEP_METADATA_SOURCE_EXCLUDES,
    });
    return toResult(doc, {
      results: stepItems,
      total,
      page,
      size,
    });
  }

  const from = (page - 1) * size;
  if (from + size > ES_MAX_RESULT_WINDOW) {
    throw new WorkflowHistoryPaginationError(WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE);
  }

  const stepExecutionsList = await workflowsExecutionEngine.searchSteps({
    executionId: workflowExecutionId,
    spaceId,
    page,
    size,
    includeInput: false,
    includeOutput: false,
    sort: 'startedAt:asc',
  });

  return toResult(doc, stepExecutionsList);
};
