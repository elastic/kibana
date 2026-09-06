/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FieldValue,
  QueryDslQueryContainer,
  SearchResponse,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionListDto } from '@kbn/workflows';
import { pickWorkflowDocumentVersion } from '@kbn/workflows';
import type { WorkflowExecutionsDataClient } from '@kbn/workflows-execution-engine/server';
import {
  getElasticsearchErrorMessage,
  isElasticsearchQueryError,
  isIndexNotFoundError,
} from './es_error_helpers';

interface SearchWorkflowExecutionsParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  logger: Logger;
  query: QueryDslQueryContainer;
  sort?: Sort;
  collapse?: { field: string };
  size?: number;
  from?: number;
  page?: number;
  /** When set, uses cursor pagination instead of `from`. */
  searchAfter?: FieldValue[];
}

/** Fields required to build {@link WorkflowExecutionListDto} without fetching full execution snapshots. */
export const WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES = [
  'spaceId',
  'stepId',
  'status',
  'error',
  'isTestRun',
  'startedAt',
  'finishedAt',
  'duration',
  'workflowId',
  'triggeredBy',
  'executedBy',
  'createdBy',
  'concurrencyGroupKey',
  'managed',
  'managedBy',
  'originManagedWorkflowId',
  'managedVersion',
  'version',
  'workflowDefinition.name',
  'workflowDefinition.tags',
] as const;

const DEFAULT_SORT: Sort = [{ createdAt: 'desc' }, { id: 'desc' }];

export const searchWorkflowExecutions = async ({
  workflowExecutionsDataClient,
  logger,
  query,
  sort = DEFAULT_SORT,
  collapse,
  size = 100,
  from,
  page = 1,
  searchAfter,
}: SearchWorkflowExecutionsParams): Promise<WorkflowExecutionListDto> => {
  try {
    logger.debug('Searching workflow executions');
    const response = await workflowExecutionsDataClient.search({
      query,
      _source: { includes: [...WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES] },
      sort,
      size,
      // Prefer search_after for deep paging; `from` is only for legacy offset pages.
      ...(searchAfter && searchAfter.length > 0 ? { search_after: searchAfter } : { from }),
      collapse,
      track_total_hits: true,
    });

    return transformToWorkflowExecutionListModel(response, page, size);
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return {
        results: [],
        size,
        page,
        total: 0,
      };
    }

    if (isElasticsearchQueryError(error)) {
      const message = getElasticsearchErrorMessage(error) ?? 'Invalid search query';
      throw Object.assign(new Error(message), { statusCode: 400 });
    }

    logger.error(`Failed to search workflow executions: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionListModel(
  response: SearchResponse<EsWorkflowExecution>,
  page: number,
  size: number
): WorkflowExecutionListDto {
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const results = response.hits.hits.reduce<WorkflowExecutionListDto['results']>((acc, hit) => {
    const source = hit._source;
    const id = hit._id;
    if (id != null && source != null) {
      acc.push({
        spaceId: source.spaceId,
        id,
        managed: source.managed,
        managedBy: source.managedBy,
        originManagedWorkflowId: source.originManagedWorkflowId,
        managedVersion: source.managedVersion,
        stepId: source.stepId,
        status: source.status,
        error: source.error || null,
        isTestRun: source.isTestRun ?? false,
        startedAt: source.startedAt,
        finishedAt: source.finishedAt,
        duration: source.duration,
        workflowId: source.workflowId,
        workflowName: source.workflowDefinition?.name,
        tags: source.workflowDefinition?.tags,
        triggeredBy: source.triggeredBy,
        executedBy: source.executedBy ?? source.createdBy,
        concurrencyGroupKey: source.concurrencyGroupKey,
        ...pickWorkflowDocumentVersion(source),
      });
    }
    return acc;
  }, []);

  const lastHit = response.hits.hits[response.hits.hits.length - 1];
  const nextSearchAfter =
    results.length >= size && lastHit?.sort != null ? [...lastHit.sort] : undefined;

  return {
    results,
    size,
    page,
    total,
    ...(nextSearchAfter ? { searchAfter: nextSearchAfter } : {}),
  };
}
