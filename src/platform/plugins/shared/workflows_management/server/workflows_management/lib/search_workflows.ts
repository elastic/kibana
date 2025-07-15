/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  EsWorkflowSchema,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionModel,
  WorkflowListModel,
} from '@kbn/workflows';
import { searchWorkflowExecutions } from './search_workflow_executions';

interface SearchWorkflowsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowIndex: string;
  workflowExecutionIndex: string;
  _full?: boolean;
}

export const searchWorkflows = async ({
  esClient,
  logger,
  workflowIndex,
  workflowExecutionIndex,
  _full,
}: SearchWorkflowsParams) => {
  try {
    logger.info(`Searching workflows in index ${workflowIndex}`);
    const response = await esClient.search<EsWorkflowSchema>({
      index: workflowIndex,
      query: { match_all: {} },
      sort: [{ createdAt: 'desc' }],
      size: 20,
    });

    const workflowIds = response.hits.hits.map((hit) => hit._id);

    const lastExecutions = await searchWorkflowExecutions({
      esClient,
      logger,
      workflowExecutionIndex,
      query: {
        bool: {
          must: [
            {
              terms: {
                'workflowId.keyword': workflowIds.filter((id) => id !== undefined),
              },
            },
          ],
        },
      },
      sort: [{ startedAt: 'asc' }],
    });

    const lastExecutionsByWorkflowId = lastExecutions.results.reduce((acc, execution) => {
      if (execution.workflowId) {
        if (!acc[execution.workflowId]) {
          acc[execution.workflowId] = [];
        }
        acc[execution.workflowId].push(execution);
      }
      return acc;
    }, {} as Record<string, WorkflowExecutionModel[]>);

    if (_full) {
      return transformToWorkflowListModel(response, lastExecutionsByWorkflowId);
    }

    return transformToWorkflowListItemModel(response, lastExecutionsByWorkflowId);
  } catch (error) {
    logger.error(`Failed to search workflows: ${error}`);
    throw error;
  }
};

function transformToHistory(lastExecution: WorkflowExecutionModel): WorkflowExecutionHistoryModel {
  return {
    id: lastExecution.id,
    status: lastExecution.status,
    startedAt: lastExecution.startedAt,
    finishedAt: lastExecution.finishedAt,
    duration: lastExecution.duration,
  };
}

function transformToWorkflowListModel(
  response: SearchResponse<EsWorkflowSchema>,
  lastExecutionsByWorkflowId: Record<string, WorkflowExecutionModel[]>
): WorkflowListModel {
  return {
    results: response.hits.hits.map((hit) => {
      const workflowId = hit._id!;
      const workflowSchema = hit._source!;
      const lastExecutions = lastExecutionsByWorkflowId?.[workflowId] ?? [];
      return {
        id: workflowId,
        name: workflowSchema.name,
        description: workflowSchema.description,
        createdAt: workflowSchema.createdAt,
        status: workflowSchema.status,
        triggers: workflowSchema.triggers,
        tags: workflowSchema.tags ?? [],
        history: lastExecutions.map(transformToHistory),
        createdBy: workflowSchema.createdBy,
        lastUpdatedAt: workflowSchema.lastUpdatedAt,
        lastUpdatedBy: workflowSchema.lastUpdatedBy,
        steps: workflowSchema.steps,
        nodes: workflowSchema.nodes,
      };
    }),
    _pagination: {
      limit: response.hits.hits.length,
      offset: 0,
      total: response.hits.hits.length,
    },
  };
}

function transformToWorkflowListItemModel(
  response: SearchResponse<EsWorkflowSchema>,
  lastExecutionsByWorkflowId: Record<string, WorkflowExecutionModel[]>
): WorkflowListModel {
  const workflows = response.hits.hits.map((hit) => {
    const workflowSchema = hit._source!;
    const workflowId = hit._id!;
    return {
      id: workflowId,
      name: workflowSchema.name,
      description: workflowSchema.description,
      createdAt: workflowSchema.createdAt,
      status: workflowSchema.status,
      triggers: workflowSchema.triggers,
      tags: workflowSchema.tags ?? [],
      history: lastExecutionsByWorkflowId?.[workflowId]?.map(transformToHistory) ?? [],
      createdBy: workflowSchema.createdBy,
      lastUpdatedAt: workflowSchema.lastUpdatedAt,
      lastUpdatedBy: workflowSchema.lastUpdatedBy,
    };
  });

  return {
    results: workflows,
    _pagination: {
      limit: response.hits.hits.length,
      offset: 0,
      total: response.hits.hits.length,
    },
  };
}
