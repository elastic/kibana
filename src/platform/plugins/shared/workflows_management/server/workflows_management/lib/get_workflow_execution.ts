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
import { searchStepExecutions } from './search_step_executions';
import { stringifyWorkflowDefinition } from '../../../common/lib/yaml';

/**
 * Fetches step executions by their IDs using mget (O(1) operation).
 * This is real-time (reads from translog) and doesn't require index refresh.
 */
async function getStepExecutionsByIds(
  esClient: ElasticsearchClient,
  stepsExecutionIndex: string,
  stepExecutionIds: string[]
): Promise<EsWorkflowStepExecution[]> {
  if (stepExecutionIds.length === 0) {
    return [];
  }

  const mgetResponse = await esClient.mget<EsWorkflowStepExecution>({
    index: stepsExecutionIndex,
    ids: stepExecutionIds,
  });

  const steps: EsWorkflowStepExecution[] = [];
  for (const doc of mgetResponse.docs) {
    if ('found' in doc && doc.found && doc._source) {
      steps.push(doc._source);
    }
  }
  return steps;
}

interface GetWorkflowExecutionParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
  spaceId: string;
}

export const getWorkflowExecution = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  stepsExecutionIndex,
  workflowExecutionId,
  spaceId,
}: GetWorkflowExecutionParams): Promise<WorkflowExecutionDto | null> => {
  try {
    // Use direct GET by _id for O(1) lookup performance instead of search
    // This is critical for reducing ES CPU load from frequent UI polling
    let response;
    try {
      response = await esClient.get<EsWorkflowExecution>({
        index: workflowExecutionIndex,
        id: workflowExecutionId,
      });
    } catch (error: unknown) {
      // Handle 404 - document not found
      if (
        error instanceof Error &&
        'meta' in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }

    const doc = response._source;

    // Verify spaceId matches for security/multi-tenancy
    if (!doc || doc.spaceId !== spaceId) {
      return null;
    }

    let stepExecutions: EsWorkflowStepExecution[];

    // Use mget if we have step execution IDs - this is O(1) and real-time
    // (reads from translog, no refresh needed)
    if (doc.stepExecutionIds && doc.stepExecutionIds.length > 0) {
      stepExecutions = await getStepExecutionsByIds(
        esClient,
        stepsExecutionIndex,
        doc.stepExecutionIds
      );
    } else {
      // Fallback to search for backward compatibility (old workflows without stepExecutionIds)
      stepExecutions = await searchStepExecutions({
        esClient,
        logger,
        stepsExecutionIndex,
        workflowExecutionId,
        spaceId,
      });
    }

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
  // backward compatibility for workflow executions created before yaml was added to the workflow execution object
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
  };
}
