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
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type {
  GetStepExecutionsByIdsOptions,
  StepExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows-execution-engine/server';

export const STEP_EXECUTION_MGET_BATCH_SIZE = 100;
export const STEP_EXECUTIONS_MAX_DECODED_BYTES = 50 * 1024 * 1024;

export interface FetchStepExecutionsForExecutionDetailParams {
  stepExecutionsDataClient: StepExecutionsDataClient;
  logger: Logger;
  workflowExecutionId: string;
  stepExecutionIds?: string[];
  sourceExcludes?: GetStepExecutionsByIdsOptions['sourceExcludes'];
  batchSize?: number;
  maxDecodedBytes?: number;
}

export interface FetchStepExecutionsForExecutionDetailResult {
  stepExecutions: EsWorkflowStepExecution[];
  stepExecutionsTruncatedCount?: number;
}

const decodedSizeBytes = (docs: EsWorkflowStepExecution[]): number =>
  Buffer.byteLength(JSON.stringify(docs), 'utf8');

const truncatedResult = (
  stepExecutions: EsWorkflowStepExecution[],
  totalIds: number
): FetchStepExecutionsForExecutionDetailResult => {
  const stepExecutionsTruncatedCount = totalIds - stepExecutions.length;
  if (stepExecutionsTruncatedCount > 0) {
    return { stepExecutions, stepExecutionsTruncatedCount };
  }
  return { stepExecutions };
};

/**
 * Loads step executions for the execution-detail API without issuing one unbounded `_mget`.
 * Batches IDs, stops when ES aborts for response size or the decoded payload exceeds the budget,
 * and reports how many IDs were not loaded.
 */
export const fetchStepExecutionsForExecutionDetail = async ({
  stepExecutionsDataClient,
  logger,
  workflowExecutionId,
  stepExecutionIds,
  sourceExcludes,
  batchSize = STEP_EXECUTION_MGET_BATCH_SIZE,
  maxDecodedBytes = STEP_EXECUTIONS_MAX_DECODED_BYTES,
}: FetchStepExecutionsForExecutionDetailParams): Promise<FetchStepExecutionsForExecutionDetailResult> => {
  if (!stepExecutionIds?.length) {
    try {
      const stepExecutions = await getStepExecutionsByWorkflowExecution({
        stepExecutionsDataClient,
        workflowExecutionId,
        sourceExcludes,
      });
      return { stepExecutions };
    } catch (error) {
      if (isMaximumResponseSizeExceededError(error)) {
        logger.warn(
          `Failed to get workflow execution with steps: Elasticsearch response exceeded the maximum size Kibana can process`
        );
        return { stepExecutions: [] };
      }
      throw error;
    }
  }

  const loaded: EsWorkflowStepExecution[] = [];
  let offset = 0;
  let currentBatchSize = batchSize;
  let accumulatedBytes = 0;
  const getByIdsOptions = { sourceExcludes };

  while (offset < stepExecutionIds.length) {
    const chunk = stepExecutionIds.slice(offset, offset + currentBatchSize);
    try {
      const { items } = await stepExecutionsDataClient.getByIds(chunk, getByIdsOptions);
      const docs = items.map(({ document }) => document);
      const chunkBytes = decodedSizeBytes(docs);

      if (loaded.length > 0 && accumulatedBytes + chunkBytes > maxDecodedBytes) {
        logger.warn(
          `Failed to get workflow execution with steps: accumulated step data exceeded the maximum decoded size`
        );
        return truncatedResult(loaded, stepExecutionIds.length);
      }

      loaded.push(...docs);
      accumulatedBytes += chunkBytes;
      offset += chunk.length;

      if (accumulatedBytes > maxDecodedBytes && offset < stepExecutionIds.length) {
        logger.warn(
          `Failed to get workflow execution with steps: accumulated step data exceeded the maximum decoded size`
        );
        return truncatedResult(loaded, stepExecutionIds.length);
      }
    } catch (error) {
      if (!isMaximumResponseSizeExceededError(error)) {
        throw error;
      }
      logger.warn(
        `Failed to get workflow execution with steps: Elasticsearch response exceeded the maximum size Kibana can process`
      );
      if (currentBatchSize <= 1) {
        return truncatedResult(loaded, stepExecutionIds.length);
      }
      currentBatchSize = Math.floor(currentBatchSize / 2);
    }
  }

  return { stepExecutions: loaded };
};
