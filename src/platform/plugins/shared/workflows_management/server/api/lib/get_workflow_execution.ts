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
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows/server';
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

const RECENT_BACKING_INDEX_LOOKUP_COUNT = 3;

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
  try {
    const { data_streams: dataStreams } = await esClient.indices.getDataStream({
      name: _workflowExecutionIndex,
    });
    const recentBackingIndices =
      dataStreams[0]?.indices
        .map((index) => index.index_name)
        .filter((indexName): indexName is string => Boolean(indexName))
        .slice(-RECENT_BACKING_INDEX_LOOKUP_COUNT)
        .reverse() ?? [];

    const mgetResponse =
      recentBackingIndices.length > 0
        ? await esClient.mget<EsWorkflowExecution>({
            docs: recentBackingIndices.map((index) => ({
              _index: index,
              _id: workflowExecutionId,
            })),
          })
        : { docs: [] };

    const mgetDocs = mgetResponse.docs
      .map((hit) => ('found' in hit && hit.found ? hit._source ?? null : null))
      .filter((source): source is EsWorkflowExecution => source !== null)
      .filter((source) => source.spaceId === spaceId);

    if (mgetDocs.length > 1) {
      throw new Error(`Found duplicate workflow execution ID ${workflowExecutionId}`);
    }

    const doc =
      mgetDocs[0] ??
      (
        await esClient.search<EsWorkflowExecution>({
          index: _workflowExecutionIndex,
          query: { ids: { values: [workflowExecutionId] } },
          size: 2,
        })
      ).hits.hits
        .map((hit) => hit._source ?? null)
        .filter((source): source is EsWorkflowExecution => source !== null)
        .filter((source) => source.spaceId === spaceId)[0];

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
