/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { Query, TimeRange } from '@kbn/es-query';
import type {
  CustomCellRenderer,
  CustomGridColumnsConfiguration,
  SortOrder,
} from '@kbn/unified-data-table';
import {
  buildWorkflowExecuteHitSearchIdentityKey,
  useWorkflowExecuteHitSearch,
  type WorkflowExecuteHitSearchPageResult,
} from './use_workflow_execute_hit_search';
import {
  useWorkflowExecuteHitTableConfig,
  type UseWorkflowExecuteHitTableConfigResult,
} from './use_workflow_execute_hit_table_config';
import { DEFAULT_WORKFLOW_EXECUTE_HIT_SORT } from './workflow_execute_hit_search_sort';
import type { WorkflowExecuteKibanaServices } from './workflow_execute_unified_table_base';

export interface WorkflowExecuteHitTabFetchPageParams {
  pageIndex: number;
  submittedQueryString: string;
  timeRange: TimeRange;
  tableSort: SortOrder[];
}

export interface UseWorkflowExecuteHitTabSearchStateOptions {
  dataView: DataView | null;
  services: WorkflowExecuteKibanaServices;
  setErrors: (errors: string | null) => void;
  resolveFetchError: (error: unknown) => string;
  fetchPage: (
    params: WorkflowExecuteHitTabFetchPageParams
  ) => Promise<WorkflowExecuteHitSearchPageResult>;
  defaultColumns: readonly string[];
  externalCustomRenderers?: CustomCellRenderer;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
  ensureColumnWhenOnlyTimeField?: string;
  onSelectionChange: (selectedRecords: DataTableRecord[]) => void;
  isTableGridFullScreen?: boolean;
  onTableGridFullScreenChange?: (isFullScreen: boolean) => void;
}

export interface UseWorkflowExecuteHitTabSearchStateResult {
  query: Query;
  timeRange: TimeRange;
  submittedQueryString: string;
  handleQueryChange: (params: { query?: Query; dateRange: TimeRange }) => void;
  handleQuerySubmit: (params: { query?: Query; dateRange: TimeRange }) => void;
  hitSearch: ReturnType<typeof useWorkflowExecuteHitSearch>;
  tableConfig: UseWorkflowExecuteHitTableConfigResult;
  handleSortChange: (nextSort: string[][]) => void;
}

export function useWorkflowExecuteHitTabSearchState({
  dataView,
  services,
  setErrors,
  resolveFetchError,
  fetchPage,
  defaultColumns,
  externalCustomRenderers,
  customGridColumnsConfiguration,
  ensureColumnWhenOnlyTimeField,
  onSelectionChange,
  isTableGridFullScreen = false,
  onTableGridFullScreenChange,
}: UseWorkflowExecuteHitTabSearchStateOptions): UseWorkflowExecuteHitTabSearchStateResult {
  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [submittedQuery, setSubmittedQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });
  const [tableSort, setTableSort] = useState<SortOrder[]>(DEFAULT_WORKFLOW_EXECUTE_HIT_SORT);

  const submittedQueryString = typeof submittedQuery.query === 'string' ? submittedQuery.query : '';

  const fetchPageCallback = useCallback(
    (pageIndex: number) =>
      fetchPage({
        pageIndex,
        submittedQueryString,
        timeRange,
        tableSort,
      }),
    [fetchPage, submittedQueryString, timeRange, tableSort]
  );

  const searchIdentityKey = useMemo(
    () =>
      buildWorkflowExecuteHitSearchIdentityKey({
        dataViewId: dataView?.id,
        submittedQueryString,
        timeRange,
        tableSort,
      }),
    [dataView?.id, submittedQueryString, timeRange, tableSort]
  );

  const hitSearch = useWorkflowExecuteHitSearch({
    enabled: Boolean(dataView),
    searchIdentityKey,
    fetchPage: fetchPageCallback,
    setErrors,
    resolveFetchError,
  });

  const tableConfig = useWorkflowExecuteHitTableConfig({
    services,
    dataView,
    hits: hitSearch.hits,
    defaultColumns,
    externalCustomRenderers,
    customGridColumnsConfiguration,
    ensureColumnWhenOnlyTimeField,
    onSelectionChange,
    setErrors,
    tableSort,
    onTableSortChange: setTableSort,
  });

  const handleTableSortChange = tableConfig.handleSortChange;
  const { resetPageIndex } = hitSearch;

  const handleSortChange = useCallback(
    (nextSort: string[][]) => {
      resetPageIndex();
      handleTableSortChange(nextSort);
    },
    [handleTableSortChange, resetPageIndex]
  );

  const handleQueryChange = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (newQuery) {
        setQuery(newQuery);
      }
      setTimeRange((previousTimeRange) =>
        previousTimeRange.from === dateRange.from && previousTimeRange.to === dateRange.to
          ? previousTimeRange
          : dateRange
      );
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (newQuery) {
        setQuery(newQuery);
        setSubmittedQuery(newQuery);
      }
      setTimeRange(dateRange);
    },
    []
  );

  useEffect(() => {
    if (hitSearch.hits.length === 0 && isTableGridFullScreen) {
      onTableGridFullScreenChange?.(false);
    }
  }, [hitSearch.hits.length, isTableGridFullScreen, onTableGridFullScreenChange]);

  return {
    query,
    timeRange,
    submittedQueryString,
    handleQueryChange,
    handleQuerySubmit,
    hitSearch,
    tableConfig,
    handleSortChange,
  };
}
