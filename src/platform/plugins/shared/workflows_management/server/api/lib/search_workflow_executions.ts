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
  isResultWindowTooLargeError,
} from './es_error_helpers';

/** Filter aggregation: at least one non-empty `runName` in the full query, not just this page. */
export const NAMED_EXECUTION_AGGREGATION = 'namedExecutions';

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
  /**
   * When set, the first-page response reports whether this query matches any named execution.
   * Callers pass a workflow, space, and access-control query so list filters do not hide the column.
   */
  namedExecutionQuery?: QueryDslQueryContainer;
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
  'runName',
  'triggeredBy',
  'executedBy',
  'effectiveIdentity',
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
  namedExecutionQuery,
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
      // `global` ignores the list filters (status, run type, executed by) on `query`.
      ...(namedExecutionQuery
        ? {
            aggs: {
              [NAMED_EXECUTION_AGGREGATION]: {
                global: {},
                aggs: {
                  matching: { filter: namedExecutionQuery },
                },
              },
            },
          }
        : {}),
    });

    return transformToWorkflowExecutionListModel(
      response,
      page,
      size,
      Boolean(namedExecutionQuery)
    );
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return {
        results: [],
        size,
        page,
        total: 0,
        ...(namedExecutionQuery ? { hasNamedExecution: false } : {}),
      };
    }

    if (isResultWindowTooLargeError(error)) {
      throw error;
    }

    if (isElasticsearchQueryError(error)) {
      const message = getElasticsearchErrorMessage(error) ?? 'Invalid search query';
      throw Object.assign(new Error(message), { statusCode: 400 });
    }

    logger.error(`Failed to search workflow executions: ${error}`);
    throw error;
  }
};

const isDocCount = (value: unknown): value is { doc_count: number } =>
  typeof value === 'object' &&
  value !== null &&
  'doc_count' in value &&
  typeof value.doc_count === 'number';

function readHasNamedExecution(response: SearchResponse<EsWorkflowExecution>): boolean | undefined {
  const aggregate = response.aggregations?.[NAMED_EXECUTION_AGGREGATION];
  if (!aggregate || typeof aggregate !== 'object' || !('matching' in aggregate)) {
    return undefined;
  }
  const matching = aggregate.matching;
  if (!isDocCount(matching)) {
    return undefined;
  }
  return matching.doc_count > 0;
}

function transformToWorkflowExecutionListModel(
  response: SearchResponse<EsWorkflowExecution>,
  page: number,
  size: number,
  includeNamedExecution: boolean
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
        runName: source.runName,
        workflowName: source.workflowDefinition?.name,
        tags: source.workflowDefinition?.tags,
        triggeredBy: source.triggeredBy,
        effectiveIdentity: source.effectiveIdentity,
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

  const hasNamedExecution = includeNamedExecution
    ? readHasNamedExecution(response) ?? false
    : undefined;

  return {
    results,
    size,
    page,
    total,
    ...(nextSearchAfter ? { searchAfter: nextSearchAfter } : {}),
    ...(hasNamedExecution !== undefined ? { hasNamedExecution } : {}),
  };
}
