/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getExecutionSteps } from '@kbn/workflows-execution-engine/server';
import type { StepExecutionListResult } from './search_step_executions';

export interface GetExecutionStepExecutionsParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  logger: Logger;
  workflowExecutionId: string;
  spaceId: string;
  page: number;
  size: number;
}

export interface GetExecutionStepExecutionsResult {
  workflowExecution: EsWorkflowExecution;
  stepExecutionListResult: StepExecutionListResult;
}

/**
 * Lists step executions for a single workflow run, without input or output.
 * Uses `_mget` by `stepExecutionIds` when present; falls back to search for legacy docs.
 * Both paths return start order (id-list order / `startedAt:asc`) so page 1 is the beginning of the run.
 */
export const getExecutionStepExecutions = async ({
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  logger,
  workflowExecutionId,
  spaceId,
  page,
  size,
}: GetExecutionStepExecutionsParams): Promise<GetExecutionStepExecutionsResult> => {
  const pageResult = await getExecutionSteps(
    { logger, workflowExecutionsDataClient, stepExecutionsDataClient },
    { executionId: workflowExecutionId, spaceId, page, size }
  );
  return {
    workflowExecution: { spaceId, managed: pageResult.managed } as EsWorkflowExecution,
    stepExecutionListResult: pageResult.steps,
  };
};
