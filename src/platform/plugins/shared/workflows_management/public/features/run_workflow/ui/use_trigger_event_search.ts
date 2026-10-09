/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Query, TimeRange } from '@kbn/es-query';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { WorkflowYaml } from '@kbn/workflows';
import { useQueryTriggerEvents } from '@kbn/workflows-ui';
import { TIMEPICKER_FALLBACK } from './constants';
import type { TriggerEventLogGridRow } from './trigger_event_log_grid_cells';
import { triggerSourceToGridRow } from './trigger_event_log_grid_cells';
import { resolveWorkflowsEventsHasMoreHits } from './trigger_event_search_totals';
import { useAccumulatedTriggerEventSearchPages } from './workflow_execute_event_form_infinite_list';
import { buildDefaultTriggerEventSearchQuery } from './workflow_execute_modal_helpers';

export const TRIGGER_EVENT_SEARCH_PAGE_SIZE = 50;

function getTriggerEventSearchIdentity(
  submittedQuery: Query,
  timeRange: Pick<TimeRange, 'from' | 'to'>
): string {
  const submittedKql = typeof submittedQuery.query === 'string' ? submittedQuery.query.trim() : '';
  return `${submittedKql}|${timeRange.from}|${timeRange.to}`;
}

export interface TriggerEventTableRow {
  id: string;
  grid: TriggerEventLogGridRow;
  source: Record<string, unknown>;
}

function resolveTriggerEventTableLoadingState(
  isSearchLoading: boolean,
  accumulatedHitsLength: number,
  isEventConfigLoading: boolean,
  isFetching: boolean
): DataLoadingState {
  const isInitialSearchLoading =
    (isSearchLoading && accumulatedHitsLength === 0) || isEventConfigLoading;
  if (isInitialSearchLoading) {
    return DataLoadingState.loading;
  }
  if (isFetching && accumulatedHitsLength > 0) {
    return DataLoadingState.loadingMore;
  }
  return DataLoadingState.loaded;
}

export interface UseTriggerEventSearchOptions {
  definition: WorkflowYaml | null;
  customTriggerTypeIds: readonly string[];
  customTriggerIdsKey: string;
  queryEnabled: boolean;
  isEventConfigLoading: boolean;
  getTimeDefaults: () => TimeRange;
}

export function useTriggerEventSearch(options: UseTriggerEventSearchOptions) {
  const {
    definition,
    customTriggerTypeIds,
    customTriggerIdsKey,
    queryEnabled,
    isEventConfigLoading,
    getTimeDefaults,
  } = options;

  const [query, setQuery] = useState<Query>(() =>
    buildDefaultTriggerEventSearchQuery(customTriggerTypeIds)
  );
  const [submittedQuery, setSubmittedQuery] = useState<Query>(() =>
    buildDefaultTriggerEventSearchQuery(customTriggerTypeIds)
  );
  const [timeRange, setTimeRange] = useState<TimeRange>(
    () => getTimeDefaults() ?? TIMEPICKER_FALLBACK
  );
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const defaultQuery = buildDefaultTriggerEventSearchQuery(customTriggerTypeIds);
    setQuery(defaultQuery);
    setSubmittedQuery(defaultQuery);
  }, [customTriggerIdsKey, customTriggerTypeIds]);

  const searchParams = useMemo(() => {
    const submittedKql =
      typeof submittedQuery.query === 'string' ? submittedQuery.query.trim() : '';
    return {
      ...(submittedKql.length > 0 ? { kql: submittedKql } : {}),
      from: timeRange.from,
      to: timeRange.to,
      page: pageIndex + 1,
      size: TRIGGER_EVENT_SEARCH_PAGE_SIZE,
    };
  }, [submittedQuery, timeRange.from, timeRange.to, pageIndex]);

  const {
    data: searchResult,
    isLoading: isSearchLoading,
    isFetching,
    isPreviousData,
    isError,
    error: searchError,
    refetch: refetchTriggerEvents,
  } = useQueryTriggerEvents(searchParams, { enabled: queryEnabled });

  const [accumulatedHits, setAccumulatedHits] = useAccumulatedTriggerEventSearchPages(
    searchResult,
    pageIndex,
    isPreviousData
  );

  const previousDefinitionRef = useRef(definition);
  const previousSearchIdentityRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const searchIdentity = getTriggerEventSearchIdentity(submittedQuery, timeRange);
    const definitionChanged = previousDefinitionRef.current !== definition;
    const searchChanged = previousSearchIdentityRef.current !== searchIdentity;

    previousDefinitionRef.current = definition;
    previousSearchIdentityRef.current = searchIdentity;

    if (!definitionChanged && !searchChanged) {
      return;
    }

    setPageIndex(0);
    setAccumulatedHits([]);
  }, [definition, submittedQuery, timeRange, setAccumulatedHits]);

  const handleLoadMoreTriggerEventPage = useCallback(() => {
    setPageIndex((p) => p + 1);
  }, []);

  const rows: TriggerEventTableRow[] = useMemo(() => {
    if (!accumulatedHits.length) {
      return [];
    }
    return accumulatedHits.map((hit) => {
      const source: Record<string, unknown> = { ...hit.source };
      return {
        id: hit.id,
        source,
        grid: triggerSourceToGridRow(hit.id, source),
      };
    });
  }, [accumulatedHits]);

  const hasMoreHits = Boolean(
    searchResult &&
      resolveWorkflowsEventsHasMoreHits({
        totalHits: searchResult.total,
        accumulatedHitsLength: accumulatedHits.length,
        currentPageHitsLength: searchResult.hits.length,
        pageSize: TRIGGER_EVENT_SEARCH_PAGE_SIZE,
      })
  );
  const totalHits = searchResult?.total ?? 0;

  const onFetchMoreRecords = useMemo(
    () => (hasMoreHits && !isFetching ? handleLoadMoreTriggerEventPage : undefined),
    [hasMoreHits, isFetching, handleLoadMoreTriggerEventPage]
  );

  const tableLoadingState = resolveTriggerEventTableLoadingState(
    isSearchLoading,
    accumulatedHits.length,
    isEventConfigLoading,
    isFetching
  );

  const handleQueryChange = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      if (newQuery) {
        setQuery(newQuery);
      }
      setTimeRange(dateRange);
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      const nextSubmittedQuery = newQuery ?? submittedQuery;
      const searchIdentityChanged =
        getTriggerEventSearchIdentity(nextSubmittedQuery, dateRange) !==
        getTriggerEventSearchIdentity(submittedQuery, timeRange);

      if (newQuery) {
        setQuery(newQuery);
        setSubmittedQuery(newQuery);
      }
      setTimeRange(dateRange);
      setPageIndex(0);

      if (searchIdentityChanged || pageIndex !== 0) {
        setAccumulatedHits([]);
        return;
      }

      void refetchTriggerEvents();
    },
    [submittedQuery, timeRange, pageIndex, setAccumulatedHits, refetchTriggerEvents]
  );

  const handleRefresh = useCallback(
    ({ dateRange }: { dateRange: TimeRange }) => {
      handleQuerySubmit({ query: submittedQuery, dateRange });
    },
    [handleQuerySubmit, submittedQuery]
  );

  return {
    query,
    submittedQuery,
    timeRange,
    searchResult,
    isSearchLoading,
    isFetching,
    isError,
    searchError,
    accumulatedHits,
    rows,
    totalHits,
    onFetchMoreRecords,
    tableLoadingState,
    handleQueryChange,
    handleQuerySubmit,
    handleRefresh,
  };
}
