/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  WorkflowAggsDto,
  WorkflowDetailDto,
  WorkflowExecutionHistoryModel,
  WorkflowListDto,
  WorkflowStatsDto,
} from '@kbn/workflows';
import { buildWorkflowFilters } from '@kbn/workflows/server';
import type { WorkflowListItemDto, WorkflowSortField } from '@kbn/workflows/types/v1';
import type {
  ExecutionVisibility,
  StepExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getDailyExecutionCounts } from '@kbn/workflows-execution-engine/server';

import type { WorkflowSearchDeps } from './types';
import { isIndexNotFoundError } from '../api/lib/es_error_helpers';
import { paginateWithSearchAfter } from '../api/lib/paginate_with_search_after';
import { transformStorageDocumentToWorkflowDto } from '../api/lib/workflow_dto_transform';
import {
  buildConditionalTermsFilters,
  buildWorkflowTextSearchClause,
} from '../api/lib/workflow_query_filters';
import type { GetWorkflowAggsOptions, GetWorkflowsParams } from '../api/workflows_management_api';
import type { WorkflowProperties } from '../storage/workflow_storage';
import { workflowIndexName } from '../storage/workflow_storage';

const ES_SORT_FIELDS: Record<WorkflowSortField, string> = {
  name: 'name.keyword',
  enabled: 'enabled',
};

const buildVisibilityContextFilter = (
  managedFilter: GetWorkflowsParams['managedFilter'],
  visibilityContext: GetWorkflowsParams['visibilityContext']
): estypes.QueryDslQueryContainer | null => {
  if (!visibilityContext) {
    return null;
  }

  const contextFilter = { terms: { managedVisibilityContexts: visibilityContext } };

  if (managedFilter === 'managed') {
    return contextFilter;
  }

  if (managedFilter === 'all') {
    return {
      bool: {
        should: [{ bool: { must_not: [{ term: { managed: true } }] } }, contextFilter],
        minimum_should_match: 1,
      },
    };
  }

  return null;
};

interface WorkflowAggBucket {
  key: string | number | boolean;
  key_as_string?: string;
  doc_count: number;
}

type WorkflowAggsResponse = Record<
  string,
  estypes.AggregationsMultiBucketAggregateBase<WorkflowAggBucket>
>;

export class WorkflowSearchService {
  constructor(private readonly deps: WorkflowSearchDeps) {}

  async getWorkflowsSubscribedToTrigger(
    triggerId: string,
    spaceId: string
  ): Promise<WorkflowDetailDto[]> {
    const { esClient, logger } = this.deps;

    const pageSize = 1000;
    const MAX_PAGES = 50;
    const keepAlive = '1m';
    const indexPattern = `${workflowIndexName}-*`;
    const sort: estypes.Sort = [{ updated_at: { order: 'desc' } }, '_shard_doc'];
    const { must, must_not } = buildWorkflowFilters({
      space: { id: spaceId, includeGlobal: true },
      deleted: 'not_deleted',
    });
    must.push({ term: { enabled: true } }, { term: { triggerTypes: triggerId } });
    const query = { bool: { must, must_not } };
    const _source = [
      'name',
      'description',
      'enabled',
      'yaml',
      'definition',
      'createdBy',
      'lastUpdatedBy',
      'valid',
      'created_at',
      'updated_at',
    ];

    const pitResponse = await esClient.openPointInTime({
      index: indexPattern,
      keep_alive: keepAlive,
      ignore_unavailable: true,
    });
    const pitId = pitResponse.id;

    try {
      const allHits: Array<{ _id: string; _source: WorkflowProperties }> = [];

      await paginateWithSearchAfter<WorkflowProperties>(
        {
          search: (searchAfter) =>
            esClient.search<WorkflowProperties>({
              pit: { id: pitId, keep_alive: keepAlive },
              size: pageSize,
              _source,
              query,
              sort,
              ...(searchAfter ? { search_after: searchAfter } : {}),
            }),
          pageSize,
          maxPages: MAX_PAGES,
          logger,
          operationName: `getWorkflowsSubscribedToTrigger(${triggerId}, ${spaceId})`,
          throwOnMissingSort: true,
        },
        async (hits) => {
          for (const hit of hits) {
            allHits.push({ _id: hit._id, _source: hit._source });
          }
        }
      );

      return allHits.map(({ _id, _source: source }) =>
        transformStorageDocumentToWorkflowDto(_id, source)
      );
    } finally {
      try {
        await esClient.closePointInTime({ id: pitId });
      } catch (closeErr) {
        logger.warn(`Failed to close PIT ${pitId}: ${closeErr}`);
      }
    }
  }

  async getWorkflows(
    params: GetWorkflowsParams,
    spaceId: string,
    options?: {
      includeExecutionHistory?: boolean;
      includeManagedExecutionHistory?: boolean;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
      executionAccessFilter?: estypes.QueryDslQueryContainer;
    }
  ): Promise<WorkflowListDto> {
    const {
      size = 100,
      page = 1,
      enabled,
      createdBy,
      tags,
      query,
      managedFilter,
      visibilityContext,
      sortField,
      sortOrder = 'asc',
    } = params;
    const from = (page - 1) * size;
    const resolvedManagedFilter = managedFilter ?? 'unmanaged';

    const { must, must_not } = buildWorkflowFilters({
      space: { id: spaceId, includeGlobal: true },
      deleted: 'not_deleted',
      managed: resolvedManagedFilter,
    });

    if (options?.accessControlFilter) must.push(options.accessControlFilter);

    must.push(
      ...buildConditionalTermsFilters([
        { field: 'enabled', values: enabled },
        { field: 'createdBy', values: createdBy },
        { field: 'tags', values: tags },
      ])
    );

    if (query) {
      must.push(buildWorkflowTextSearchClause(query));
    }
    const visibilityContextFilter = buildVisibilityContextFilter(
      resolvedManagedFilter,
      visibilityContext
    );
    if (visibilityContextFilter) {
      must.push(visibilityContextFilter);
    }

    const esSort = sortField
      ? [
          { [ES_SORT_FIELDS[sortField]]: { order: sortOrder } },
          { updated_at: { order: 'desc' as const } },
        ]
      : [{ updated_at: { order: 'desc' as const } }];

    const searchResponse = await this.deps.workflowStorage.getClient().search({
      size,
      from,
      track_total_hits: true,
      query: {
        bool: { must, must_not },
      },
      sort: esSort,
    });

    const workflows = searchResponse.hits.hits
      .map<WorkflowListItemDto>((hit) => {
        if (!hit._source) {
          throw new Error('Missing _source in search result');
        }
        const workflow = transformStorageDocumentToWorkflowDto(hit._id, hit._source);
        return {
          ...workflow,
          description: workflow.description || '',
          definition: workflow.definition,
        };
      })
      .filter((workflow): workflow is NonNullable<typeof workflow> => workflow !== null);

    if (options?.includeExecutionHistory && workflows.length > 0) {
      const workflowIds = workflows
        .filter((workflow) => workflow.managed !== true || options.includeManagedExecutionHistory)
        .map((workflow) => workflow.id);
      const executionHistory = await this.getRecentExecutionsForWorkflows(workflowIds, spaceId);
      workflows.forEach((workflow) => {
        workflow.history = executionHistory[workflow.id] || [];
      });
    }

    return {
      page,
      size,
      total:
        typeof searchResponse.hits.total === 'number'
          ? searchResponse.hits.total
          : searchResponse.hits.total?.value || 0,
      results: workflows,
    };
  }

  async getWorkflowStats(
    spaceId: string,
    options?: {
      includeExecutionStats?: boolean;
      includeManagedExecutionStats?: boolean;
      request?: KibanaRequest;
      accessControlFilter?: estypes.QueryDslQueryContainer;
      executionVisibility?: ExecutionVisibility;
    }
  ): Promise<WorkflowStatsDto> {
    const statsFilter = buildWorkflowFilters({
      space: { id: spaceId, includeGlobal: true },
      deleted: 'not_deleted',
      managed: 'unmanaged',
    });
    if (options?.accessControlFilter) statsFilter.must.push(options.accessControlFilter);
    const statsResponse = await this.deps.workflowStorage.getClient().search({
      size: 0,
      track_total_hits: true,
      query: {
        bool: statsFilter,
      },
      aggs: {
        enabled_count: {
          filter: { term: { enabled: true } },
        },
        disabled_count: {
          filter: { term: { enabled: false } },
        },
      },
    });

    const aggs = statsResponse.aggregations;
    const workflowsStats: WorkflowStatsDto = {
      workflows: {
        enabled: aggs?.enabled_count.doc_count ?? 0,
        disabled: aggs?.disabled_count.doc_count ?? 0,
      },
    };

    if (options?.includeExecutionStats) {
      workflowsStats.executions = await this.getExecutionHistoryStats(spaceId, {
        includeManagedExecutions: options.includeManagedExecutionStats === true,
        visibility: options.executionVisibility,
      });
    }

    return workflowsStats;
  }

  async getWorkflowAggs(
    fields: string[],
    spaceId: string,
    options?: GetWorkflowAggsOptions
  ): Promise<WorkflowAggsDto> {
    const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};

    fields.forEach((field) => {
      aggs[field] = {
        terms: {
          field: field === 'name' ? 'name.keyword' : field,
          size: 100,
        },
      };
    });

    try {
      const aggsFilter = buildWorkflowFilters({
        space: { id: spaceId, includeGlobal: true },
        deleted: 'not_deleted',
        managed: options?.managedFilter ?? 'unmanaged',
      });
      if (options?.accessControlFilter) aggsFilter.must.push(options.accessControlFilter);
      const aggsResponse = await this.deps.workflowStorage.getClient().search({
        size: 0,
        track_total_hits: true,
        query: {
          bool: aggsFilter,
        },
        aggs,
      });

      const result: WorkflowAggsDto = {};
      const responseAggs = aggsResponse.aggregations ?? {};

      fields.forEach((field) => {
        const termsAggregation = (responseAggs as WorkflowAggsResponse)[field];
        if (termsAggregation && Array.isArray(termsAggregation.buckets)) {
          result[field] = termsAggregation.buckets.map((bucket) => {
            // Prefer `key_as_string` so non-string ES keys (booleans, numbers, dates)
            // round-trip back to the matching schema values used by the workflow filters.
            const key = bucket.key_as_string ?? String(bucket.key);
            return {
              label: key,
              key,
              doc_count: bucket.doc_count,
            };
          });
        }
      });

      return result;
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return {};
      }
      throw error;
    }
  }

  private async getExecutionHistoryStats(
    spaceId: string,
    options?: {
      includeManagedExecutions?: boolean;
      visibility?: ExecutionVisibility;
    }
  ) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    return getDailyExecutionCounts(
      {
        logger: this.deps.logger,
        workflowExecutionsDataClient: this.deps.workflowExecutionsDataClient,
        stepExecutionsDataClient: {} as StepExecutionsDataClient,
      },
      {
        spaceId,
        since: since.toISOString(),
        visibility: options?.visibility,
        includeManaged: options?.includeManagedExecutions,
      }
    );
  }

  private async getRecentExecutionsForWorkflows(
    workflowIds: string[],
    spaceId: string
  ): Promise<Record<string, WorkflowExecutionHistoryModel[]>> {
    if (workflowIds.length === 0) {
      return {};
    }

    try {
      const response = await this.deps.workflowExecutionsDataClient.search({
        size: 0,
        query: {
          bool: {
            must: [
              { terms: { workflowId: workflowIds } },
              {
                bool: {
                  should: [
                    { term: { spaceId } },
                    { bool: { must_not: { exists: { field: 'spaceId' } } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          workflows: {
            terms: { field: 'workflowId', size: workflowIds.length },
            aggs: {
              recent_executions: {
                top_hits: { size: 1, sort: [{ finishedAt: { order: 'desc' } }] },
              },
            },
          },
        },
      });

      const result: Record<string, WorkflowExecutionHistoryModel[]> = {};
      const aggregate = response.aggregations?.workflows;
      if (!aggregate || !('buckets' in aggregate) || !Array.isArray(aggregate.buckets)) {
        return result;
      }

      for (const bucket of aggregate.buckets as LatestExecutionBucket[]) {
        const execution = bucket.recent_executions.hits.hits[0]?._source;
        if (execution) {
          result[bucket.key] = [
            {
              id: execution.id,
              workflowId: execution.workflowId,
              workflowName: execution.workflowDefinition?.name || 'Unknown Workflow',
              status: execution.status,
              startedAt: execution.startedAt,
              finishedAt: execution.finishedAt || execution.startedAt,
              duration:
                execution.finishedAt && execution.startedAt
                  ? new Date(execution.finishedAt).getTime() -
                    new Date(execution.startedAt).getTime()
                  : null,
            },
          ];
        }
      }
      return result;
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.deps.logger.error(`Failed to fetch recent executions for workflows: ${error}`);
      }
      return {};
    }
  }
}

interface LatestExecutionBucket {
  key: string;
  recent_executions: {
    hits: { hits: Array<{ _source?: EsWorkflowExecution }> };
  };
}
