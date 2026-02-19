/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows/types/latest';
import { WORKFLOWS_EXECUTION_STATE_INDEX } from '../../common/mappings';
import { WORKFLOWS_EXECUTIONS_DATA_STREAM } from '../repositories/workflow_execution_repository/constants';
import type { SearchWorkflowExecutions } from '../types';

export function searchWorkflowExecutionsFn(
  esClient: ElasticsearchClient
): SearchWorkflowExecutions {
  return async ({ query, sort = [{ createdAt: 'desc' }], size = 100, from, page = 1 }) => {
    const filter: QueryDslQueryContainer[] = [];

    if (query.bool?.filter) {
      if (Array.isArray(query.bool.filter)) {
        filter.push(...query.bool.filter);
      } else {
        filter.push(query.bool.filter);
      }
    }

    filter.push({ term: { type: 'workflow' } });

    const modifiedQuery = {
      ...query,
      bool: {
        ...query.bool,
        filter,
      },
    };

    const response = await esClient.search({
      index: [WORKFLOWS_EXECUTIONS_DATA_STREAM, WORKFLOWS_EXECUTION_STATE_INDEX],
      query: modifiedQuery,
      sort,
      size,
      from,
      track_total_hits: true,
      collapse: { field: 'id' },
    });

    return {
      results: response.hits.hits.map((hit) => hit._source as EsWorkflowExecution),
      page,
      size,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0,
    };
  };
}
