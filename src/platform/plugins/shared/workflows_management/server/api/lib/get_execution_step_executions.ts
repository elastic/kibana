/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import type { EsWorkflowExecution, WorkflowStepExecutionListDto } from '@kbn/workflows';
import type {
  GetStepExecutionsByIdsOptions,
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { searchStepExecutions } from './search_step_executions';

const PARENT_SOURCE_INCLUDES: Array<keyof EsWorkflowExecution> = ['spaceId', 'stepExecutionIds'];

const STEP_METADATA_SOURCE_EXCLUDES: NonNullable<GetStepExecutionsByIdsOptions['sourceExcludes']> =
  ['input', 'output'];

export interface GetExecutionStepExecutionsParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  logger: Logger;
  workflowExecutionId: string;
  spaceId: string;
  page: number;
  size: number;
}

const emptyPage = (page: number, size: number, total = 0): WorkflowStepExecutionListDto => ({
  results: [],
  total,
  page,
  size,
});

/**
 * Lists step executions for a single workflow run, without input or output.
 * Uses `_mget` by `stepExecutionIds` when present; falls back to search for legacy docs.
 */
export const getExecutionStepExecutions = async ({
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  logger,
  workflowExecutionId,
  spaceId,
  page,
  size,
}: GetExecutionStepExecutionsParams): Promise<WorkflowStepExecutionListDto> => {
  const { items } = await workflowExecutionsDataClient.getByIds([workflowExecutionId], {
    sourceIncludes: PARENT_SOURCE_INCLUDES as GetWorkflowExecutionsByIdsOptions['sourceIncludes'],
  });
  const doc = items[0]?.document;
  if (!doc || doc.spaceId !== spaceId) {
    return emptyPage(page, size);
  }

  const stepExecutionIds = doc.stepExecutionIds;
  if (stepExecutionIds) {
    const total = stepExecutionIds.length;
    const ids = stepExecutionIds.slice((page - 1) * size, page * size);
    if (ids.length === 0) {
      return emptyPage(page, size, total);
    }

    try {
      const { items: stepItems } = await stepExecutionsDataClient.getByIds(ids, {
        sourceExcludes: STEP_METADATA_SOURCE_EXCLUDES,
      });
      return {
        results: stepItems.map(({ document }) => document),
        total,
        page,
        size,
      };
    } catch (error) {
      if (!isMaximumResponseSizeExceededError(error)) {
        throw error;
      }
      logger.warn(
        `Failed to get workflow execution ${workflowExecutionId} with steps: Elasticsearch response exceeded the maximum size Kibana can process (page=${page}, size=${size})`
      );
      return emptyPage(page, size, total);
    }
  }

  try {
    return await searchStepExecutions({
      stepExecutionsDataClient,
      logger,
      workflowExecutionId,
      spaceId,
      sourceExcludes: STEP_METADATA_SOURCE_EXCLUDES,
      page,
      size,
    });
  } catch (error) {
    if (!isMaximumResponseSizeExceededError(error)) {
      throw error;
    }
    logger.warn(
      `Failed to get workflow execution ${workflowExecutionId} with steps: Elasticsearch response exceeded the maximum size Kibana can process (page=${page}, size=${size})`
    );
    return emptyPage(page, size);
  }
};
