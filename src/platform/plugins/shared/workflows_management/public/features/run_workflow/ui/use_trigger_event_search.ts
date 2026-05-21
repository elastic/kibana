/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { Query, TimeRange } from '@kbn/es-query';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { WorkflowYaml } from '@kbn/workflows';
import { useQueryTriggerEvents } from '@kbn/workflows-ui';
import { TIMEPICKER_FALLBACK } from './constants';
import type { TriggerEventLogGridRow } from './trigger_event_log_grid_cells';
import { triggerSourceToGridRow } from './trigger_event_log_grid_cells';
import {
  useAccumulatedTriggerEventSearchPages,
  useTriggerEventGridScrollLoadMore,
} from './workflow_execute_event_form_infinite_list';
import { buildDefaultTriggerEventSearchQuery } from './workflow_execute_modal_helpers';

export const TRIGGER_EVENT_SEARCH_PAGE_SIZE = 50;

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
  dataViewReady: boolean;
  surfaceRef: RefObject<HTMLDivElement | null>;
  getTimeDefaults: () => TimeRange;
}

export function useTriggerEventSearch(options: UseTriggerEventSearchOptions) {
  const {
    definition,
    customTriggerTypeIds,
    customTriggerIdsKey,
    queryEnabled,
    isEventConfigLoading,
    dataViewReady,
    surfaceRef,
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
  } = useQueryTriggerEvents(searchParams, { enabled: queryEnabled });

  const [accumulatedHits, setAccumulatedHits] = useAccumulatedTriggerEventSearchPages(
    searchResult,
    pageIndex,
    isPreviousData
  );

  useLayoutEffect(() => {
    setPageIndex(0);
    setAccumulatedHits([]);
  }, [definition, submittedQuery, timeRange.from, timeRange.to, setAccumulatedHits]);

  const handleLoadMoreTriggerEventPage = useCallback(() => {
    setPageIndex((p) => p + 1);
  }, []);

  const rows: TriggerEventTableRow[] = useMemo(() => {
    if (!accumulatedHits.length) {
      return [];
    }
    return accumulatedHits.map((hit) => {
      const source = hit.source as Record<string, unknown>;
      return {
        id: hit.id,
        source,
        grid: triggerSourceToGridRow(hit.id, source),
      };
    });
  }, [accumulatedHits]);

  const hasMoreHits = Boolean(searchResult && accumulatedHits.length < searchResult.total);

  useTriggerEventGridScrollLoadMore({
    dataViewReady,
    queryEnabled,
    surfaceRef,
    isFetching,
    hasMoreHits,
    reboundKey: `${accumulatedHits.length}-${searchResult?.total ?? 0}`,
    onNearBottom: handleLoadMoreTriggerEventPage,
  });

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
      if (newQuery) {
        setQuery(newQuery);
        setSubmittedQuery(newQuery);
      }
      setTimeRange(dateRange);
      setPageIndex(0);
      setAccumulatedHits([]);
    },
    [setAccumulatedHits]
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
    hasMoreHits,
    tableLoadingState,
    handleQueryChange,
    handleQuerySubmit,
  };
}
