/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { buildEsQuery } from '@kbn/es-query';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useQuery } from '@kbn/react-query';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import {
  EXECUTION_TABLE_SORT_FIELD_MAP,
  type ExecutionTableSortOrder,
} from './workflow_executions_page_constants';
import {
  buildWorkflowExecutionsSearchFilters,
  getWorkflowExecutionsFetchErrorMessage,
} from './workflow_executions_search_query';
import { normalizeWorkflowExecutionsDurationQuery } from '../../../common/lib/normalize_workflow_executions_duration_query';
import { useKibana } from '../../hooks/use_kibana';

const WORKFLOWS_EXECUTIONS_API_VERSION = '2023-10-31';

export interface UseWorkflowExecutionsSearchParams {
  dataView: DataView;
  query: Query;
  filters: Filter[];
  timeRange: TimeRange;
  spaceId: string;
  pageIndex: number;
  pageSize: number;
  sort: ExecutionTableSortOrder;
  enabled?: boolean;
}

const mapSortToEsSort = (sort: ExecutionTableSortOrder) =>
  sort.map(([field, direction]) => {
    const esField = EXECUTION_TABLE_SORT_FIELD_MAP[field] ?? field;
    return { [esField]: { order: direction } };
  });

export const useWorkflowExecutionsSearch = ({
  dataView,
  query,
  filters,
  timeRange,
  spaceId,
  pageIndex,
  pageSize,
  sort,
  enabled = true,
}: UseWorkflowExecutionsSearchParams) => {
  const { http, uiSettings } = useKibana().services;
  const timeField = dataView.timeFieldName ?? 'startedAt';

  const searchFilters = useMemo(
    () =>
      buildWorkflowExecutionsSearchFilters({
        spaceId,
        timeRange,
        timeField,
        userFilters: filters,
      }),
    [filters, spaceId, timeField, timeRange]
  );

  const esQuery = useMemo(() => {
    const builtQuery = buildEsQuery(
      dataView,
      query?.query ? [query] : [],
      searchFilters,
      getEsQueryConfig(uiSettings)
    );

    return normalizeWorkflowExecutionsDurationQuery(builtQuery);
  }, [dataView, query, searchFilters, uiSettings]);

  const sortParam = useMemo(() => mapSortToEsSort(sort), [sort]);

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
      esQuery,
    ],
    queryFn: () =>
      http.get<WorkflowExecutionListDto>('/api/workflows/executions', {
        version: WORKFLOWS_EXECUTIONS_API_VERSION,
        query: {
          query: JSON.stringify(esQuery),
          from: pageIndex * pageSize,
          size: pageSize,
          sort: JSON.stringify(sortParam),
          trackTotalHits: true,
        },
      }),
    enabled,
    retry: false,
    meta: {
      errorMessage: getWorkflowExecutionsFetchErrorMessage(),
    },
  });
};
