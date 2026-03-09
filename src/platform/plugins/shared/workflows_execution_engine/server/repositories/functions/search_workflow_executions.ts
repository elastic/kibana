/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer, Sort } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows/types/latest';
import { WORKFLOWS_EXECUTION_STATE_INDEX } from '../../../common/mappings';
import { WORKFLOWS_EXECUTIONS_DATA_STREAM } from '../workflow_execution_repository/constants';

export interface SearchWorkflowExecutionsParams<
  K extends keyof EsWorkflowExecution = keyof EsWorkflowExecution
> {
  query: QueryDslQueryContainer;
  sort?: Sort;
  size?: number;
  from?: number;
  page?: number;
  fields?: K[];
}

export interface SearchResult<T> {
  results: T[];
  page: number;
  size: number;
  total: number;
}

export function searchWorkflowExecutionsFn(esClient: ElasticsearchClient) {
  /**
   * Searches workflow executions across both hot storage (execution state index) and
   * cold storage (execution history data stream), using field collapsing to deduplicate.
   *
   * When `fields` is provided, only those properties are fetched via `_source_includes`
   * and the return type is narrowed to `Pick<EsWorkflowExecution, K>`.
   * Results are automatically scoped to `type: 'workflow'` documents.
   */
  async function searchWorkflowExecutions(
    params: SearchWorkflowExecutionsParams
  ): Promise<SearchResult<EsWorkflowExecution>>;
  async function searchWorkflowExecutions<K extends keyof EsWorkflowExecution>(
    params: SearchWorkflowExecutionsParams<K>
  ): Promise<SearchResult<Pick<EsWorkflowExecution, K>>>;
  async function searchWorkflowExecutions<K extends keyof EsWorkflowExecution>(
    params: SearchWorkflowExecutionsParams<K>
  ): Promise<SearchResult<EsWorkflowExecution | Pick<EsWorkflowExecution, K>>> {
    const { query, sort = [{ createdAt: 'desc' }], size = 100, from, page = 1, fields } = params;
    const filter: QueryDslQueryContainer[] = [];

    if (query?.bool?.filter) {
      if (Array.isArray(query.bool.filter)) {
        filter.push(...query.bool.filter);
      } else {
        filter.push(query.bool.filter);
      }
    }

    filter.push({ term: { type: 'workflow' } });

    const modifiedQuery: QueryDslQueryContainer = {
      ...query,
      bool: {
        ...(query?.bool ?? {}),
        filter,
      },
    } as QueryDslQueryContainer;

    const response = await esClient.search({
      index: [WORKFLOWS_EXECUTIONS_DATA_STREAM, WORKFLOWS_EXECUTION_STATE_INDEX],
      query: modifiedQuery,
      sort,
      size,
      from,
      track_total_hits: true,
      collapse: { field: 'id' },
      _source: fields,
    });

    return {
      results: response.hits.hits.map((hit) => hit._source as Pick<EsWorkflowExecution, K>),
      page,
      size,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0,
    };
  }

  return searchWorkflowExecutions;
}
