/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useWorkflowExecutionsPageFilters } from './use_workflow_executions_page_filters';
import { WorkflowExecutionDetailFlyout } from './workflow_execution_detail_flyout';
import { createWorkflowExecutionsDataView } from './workflow_executions_data_view';
import { WorkflowExecutionsFilters } from './workflow_executions_filters';
import { useWorkflowExecutionsHttpInterceptor } from './workflow_executions_http_interceptor';
import { WorkflowExecutionsSearchBar } from './workflow_executions_search_bar';
import { WorkflowExecutionsTable } from './workflow_executions_table';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';
import { useWorkflowUrlState } from '../../hooks/use_workflow_url_state';

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-24h',
  to: 'now',
};

const DEFAULT_QUERY: Query = {
  query: '',
  language: 'kuery',
};

const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

const clearSelectedExecutionIfChanged = (
  previousKeyRef: React.MutableRefObject<string | null>,
  nextKey: string,
  clearSelectedExecution: () => void
) => {
  if (previousKeyRef.current !== null && previousKeyRef.current !== nextKey) {
    clearSelectedExecution();
  }
  previousKeyRef.current = nextKey;
};

export const WorkflowExecutionsPageContent = React.memo(() => {
  const { fieldFormats } = useKibana().services;
  const spaceId = useSpaceId();
  useWorkflowExecutionsHttpInterceptor();
  const dataView = useMemo(() => createWorkflowExecutionsDataView(fieldFormats), [fieldFormats]);

  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState<Query>(DEFAULT_QUERY);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [controlFilters, setControlFilters] = useState<Filter[]>([]);
  const [searchBarFilters, setSearchBarFilters] = useState<Filter[]>([]);
  const [isRefreshPaused, setIsRefreshPaused] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(DEFAULT_REFRESH_INTERVAL_MS);
  const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();
  const { applyWorkflowIdFilter, controlsUrlState, onFilterGroupInit, setControlsUrlState } =
    useWorkflowExecutionsPageFilters();
  const previousSubmittedSearchKey = useRef<string | null>(null);
  const previousControlFiltersKey = useRef<string | null>(null);
  const previousSearchBarFiltersKey = useRef<string | null>(null);

  const combinedFilters = useMemo(
    () => [...controlFilters, ...searchBarFilters],
    [controlFilters, searchBarFilters]
  );

  const handleRefreshChange = useCallback(
    ({ isPaused, refreshInterval }: { isPaused: boolean; refreshInterval: number }) => {
      setIsRefreshPaused(isPaused);
      setRefreshIntervalMs(refreshInterval);
    },
    []
  );

  const handleQueryChange = useCallback(
    ({ query: nextQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (nextQuery) {
        setQuery(nextQuery);
      }
      setTimeRange(dateRange);
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query: nextQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      const nextQueryState = nextQuery ?? query;
      if (nextQuery) {
        setQuery(nextQuery);
        setSubmittedQuery(nextQuery);
      }
      setTimeRange(dateRange);

      clearSelectedExecutionIfChanged(
        previousSubmittedSearchKey,
        JSON.stringify({ query: nextQueryState, dateRange }),
        () => setSelectedExecution(null)
      );
    },
    [query, setSelectedExecution]
  );

  const handleControlFiltersChange = useCallback(
    (filters: Filter[]) => {
      setControlFilters(filters);
      clearSelectedExecutionIfChanged(previousControlFiltersKey, JSON.stringify(filters), () =>
        setSelectedExecution(null)
      );
    },
    [setSelectedExecution]
  );

  const handleSearchBarFiltersUpdated = useCallback(
    (filters: Filter[]) => {
      setSearchBarFilters(filters);
      clearSelectedExecutionIfChanged(previousSearchBarFiltersKey, JSON.stringify(filters), () =>
        setSelectedExecution(null)
      );
    },
    [setSelectedExecution]
  );

  const handleCloseExecution = useCallback(() => {
    setSelectedExecution(null);
  }, [setSelectedExecution]);

  const handleViewAllExecutionsForWorkflow = useCallback(
    (workflowId: string) => {
      applyWorkflowIdFilter(workflowId);
      setSelectedExecution(null);
    },
    [applyWorkflowIdFilter, setSelectedExecution]
  );

  return (
    <div data-test-subj="workflowExecutionsPageContent">
      <WorkflowExecutionsSearchBar
        dataView={dataView}
        filters={searchBarFilters}
        isRefreshPaused={isRefreshPaused}
        onFiltersUpdated={handleSearchBarFiltersUpdated}
        onQueryChange={handleQueryChange}
        onQuerySubmit={handleQuerySubmit}
        onRefreshChange={handleRefreshChange}
        query={query}
        refreshInterval={refreshIntervalMs}
        timeRange={timeRange}
      />
      <EuiSpacer size="l" />
      <WorkflowExecutionsFilters
        controlsUrlState={controlsUrlState}
        filters={controlFilters}
        onFilterGroupInit={onFilterGroupInit}
        onFiltersChange={handleControlFiltersChange}
        query={submittedQuery}
        setControlsUrlState={setControlsUrlState}
        timeRange={timeRange}
      />
      <EuiSpacer size="l" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="l" />
      {spaceId ? (
        <WorkflowExecutionsTable
          dataView={dataView}
          filters={combinedFilters}
          liveUpdateIntervalMs={
            !isRefreshPaused && refreshIntervalMs > 0 ? refreshIntervalMs : undefined
          }
          onViewAllExecutionsForWorkflow={handleViewAllExecutionsForWorkflow}
          query={submittedQuery}
          spaceId={spaceId}
          timeRange={timeRange}
        />
      ) : null}
      {selectedExecutionId ? (
        <WorkflowExecutionDetailFlyout
          executionId={selectedExecutionId}
          onClose={handleCloseExecution}
          onViewAllExecutionsForWorkflow={handleViewAllExecutionsForWorkflow}
        />
      ) : null}
    </div>
  );
});
WorkflowExecutionsPageContent.displayName = 'WorkflowExecutionsPageContent';
