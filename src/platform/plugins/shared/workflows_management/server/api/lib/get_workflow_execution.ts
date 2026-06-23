/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
} from '@kbn/workflows';
import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
  WORKFLOWS_EXECUTIONS_INDEX,
} from '@kbn/workflows';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows/server';
import { decodeEncodedWorkflowExecutionId, resolveBackingIndex } from '@kbn/workflows/server/utils';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';

interface GetWorkflowExecutionParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
  spaceId: string;
  includeInput?: boolean;
  includeOutput?: boolean;
}

const resolveWorkflowExecutionGetIndex = (indexSuffix: string): string =>
  resolveBackingIndex({
    backingIndexPrefix: WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
    indexSuffix,
  });

const resolveLegacyWorkflowExecutionGetIndex = (indexSuffix: string): string =>
  `${WORKFLOWS_EXECUTIONS_INDEX}-${indexSuffix}`;

export const getWorkflowExecution = async ({
  esClient,
  logger,
  workflowExecutionIndex: _workflowExecutionIndex,
  stepsExecutionIndex,
  workflowExecutionId,
  spaceId,
  includeInput = false,
  includeOutput = false,
}: GetWorkflowExecutionParams): Promise<WorkflowExecutionDto | null> => {
  const result = decodeEncodedWorkflowExecutionId(workflowExecutionId);

  if (!result.success) {
    logger.error(`Failed to decode workflow execution ID: ${result.error}`);
    return null;
  }

  const { indexSuffix } = result;
  const dataStreamIndex = resolveWorkflowExecutionGetIndex(indexSuffix);
  const legacyIndex = resolveLegacyWorkflowExecutionGetIndex(indexSuffix);

  try {
    const fetchDoc = async (index: string) => {
      try {
        const response = await esClient.get<EsWorkflowExecution>({
          index,
          id: workflowExecutionId,
        });
        return response._source ?? null;
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          'meta' in error &&
          (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
        ) {
          return null;
        }
        throw error;
      }
    };

    const doc =
      (await fetchDoc(dataStreamIndex)) ??
      (legacyIndex !== dataStreamIndex ? await fetchDoc(legacyIndex) : null);

    if (!doc || doc.spaceId !== spaceId) {
      return null;
    }

    const sourceExcludes: string[] = [];
    if (!includeInput) sourceExcludes.push('input');
    if (!includeOutput) sourceExcludes.push('output');

    const stepExecutions = await getStepExecutionsByWorkflowExecution({
      esClient,
      stepsExecutionIndex: doc.stepExecutionsIndex,
      stepsExecutionIndexAlias: stepsExecutionIndex,
      workflowExecutionId,
      stepExecutionIds: doc.stepExecutionIds,
      sourceExcludes,
    });

    return transformToWorkflowExecutionDetailDto(workflowExecutionId, doc, stepExecutions, logger);
  } catch (error) {
    logger.error(`Failed to get workflow: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionDetailDto(
  id: string,
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[],
  logger: Logger
): WorkflowExecutionDto {
  let yaml = workflowExecution.yaml;
  try {
    if (!yaml) {
      yaml = stringifyWorkflowDefinition(workflowExecution.workflowDefinition);
    }
  } catch (error) {
    logger.error(`Failed to stringify workflow definition: ${error}`);
    yaml = '';
  }
  return {
    ...workflowExecution,
    id,
    isTestRun: workflowExecution.isTestRun ?? false,
    stepId: workflowExecution.stepId,
    stepExecutions,
    executedBy: workflowExecution.executedBy ?? workflowExecution.createdBy,
    triggeredBy: workflowExecution.triggeredBy,
    yaml,
    traceId: workflowExecution.traceId,
    entryTransactionId: workflowExecution.entryTransactionId,
    concurrencyGroupKey: workflowExecution.concurrencyGroupKey,
  };
}
