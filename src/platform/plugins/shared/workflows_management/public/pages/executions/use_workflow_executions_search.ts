/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useQuery } from '@kbn/react-query';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import {
  EXECUTION_TABLE_SORT_FIELD_MAP,
  type ExecutionTableSortOrder,
} from './workflow_executions_page_constants';
import {
  filtersToKql,
  getWorkflowExecutionsFetchErrorMessage,
  timeRangeToKql,
} from './workflow_executions_search_query';

export interface UseWorkflowExecutionsSearchParams {
  query: Query;
  filters: Filter[];
  timeRange: TimeRange;
  spaceId: string;
  pageIndex: number;
  pageSize: number;
  sort: ExecutionTableSortOrder;
  enabled?: boolean;
}

export const useWorkflowExecutionsSearch = ({
  query,
  filters,
  timeRange,
  spaceId,
  pageIndex,
  pageSize,
  sort,
  enabled = true,
}: UseWorkflowExecutionsSearchParams) => {
  const api = useWorkflowsApi();

  const kql = useMemo(() => {
    const textKql = query?.query ? `(${String(query.query)})` : '';
    const filtersKql = filtersToKql(filters);
    const timeKql = timeRangeToKql(timeRange.from, timeRange.to);
    return [textKql, filtersKql, timeKql].filter(Boolean).join(' and ') || undefined;
  }, [query, filters, timeRange]);

  const sortParams = useMemo(() => {
    const [[field, direction]] = sort;
    return {
      sortField: EXECUTION_TABLE_SORT_FIELD_MAP[field] ?? field,
      sortOrder: direction as 'asc' | 'desc',
    };
  }, [sort]);

  return useQuery<WorkflowExecutionListDto>({
    networkMode: 'always',
    queryKey: [
      'workflows',
      'executions',
      'search',
      spaceId,
      query,
      filters,
      timeRange,
      pageIndex,
      pageSize,
      sort,
    ],
    queryFn: () =>
      api.searchExecutions({
        kql,
        sortField: sortParams.sortField,
        sortOrder: sortParams.sortOrder,
        page: pageIndex + 1,
        size: pageSize,
        trackTotalHits: true,
      }),
    enabled,
    retry: false,
    meta: {
      errorMessage: getWorkflowExecutionsFetchErrorMessage(),
    },
  });
};
