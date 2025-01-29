/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getResolvedDateRange } from '../utils/get_resolved_date_range';
import type { TimeRangeUpdatesType, SearchMode } from '../types';

/**
 * Hook params
 */
export interface QuerySubscriberParams {
  data: DataPublicPluginStart;
  /**
   * Pass `timefilter` only if you are not using search sessions for the global search
   */
  timeRangeUpdatesType?: TimeRangeUpdatesType;
}

/**
 * Result from the hook
 */
export interface QuerySubscriberResult {
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
  searchMode: SearchMode | undefined;
}

/**
 * Memorizes current query, filters and absolute date range
 * @param data
 * @param timeRangeUpdatesType
 * @public
 */
export const useQuerySubscriber = ({
  data,
  timeRangeUpdatesType = 'search-session',
}: QuerySubscriberParams) => {
  const timefilter = data.query.timefilter.timefilter;
  const [result, setResult] = useState<QuerySubscriberResult>(() => {
    const state = data.query.getState();
    const dateRange = getResolvedDateRange(timefilter);
    return {
      query: state?.query,
      filters: state?.filters,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      searchMode: getSearchMode(state?.query),
    };
  });

  useEffect(() => {
    if (timeRangeUpdatesType !== 'search-session') {
      return;
    }

    const subscription = data.search.session.state$.subscribe((sessionState) => {
      const dateRange = getResolvedDateRange(timefilter);
      setResult((prevState) => ({
        ...prevState,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      }));
    });

    return () => subscription.unsubscribe();
  }, [setResult, timefilter, data.search.session.state$, timeRangeUpdatesType]);

  useEffect(() => {
    if (timeRangeUpdatesType !== 'timefilter') {
      return;
    }

    const subscription = timefilter.getTimeUpdate$().subscribe(() => {
      const dateRange = getResolvedDateRange(timefilter);
      setResult((prevState) => ({
        ...prevState,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      }));
    });

    return () => subscription.unsubscribe();
  }, [setResult, timefilter, timeRangeUpdatesType]);

  useEffect(() => {
    const subscription = data.query.state$.subscribe(({ state, changes }) => {
      if (changes.query || changes.filters) {
        setResult((prevState) => ({
          ...prevState,
          query: state.query,
          filters: state.filters,
          searchMode: getSearchMode(state.query),
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [setResult, data.query.state$]);

  return result;
};

/**
 * Checks if query result is ready to be used
 * @param result
 * @public
 */
export const hasQuerySubscriberData = (
  result: QuerySubscriberResult
): result is {
  query: Query | AggregateQuery;
  filters: Filter[];
  fromDate: string;
  toDate: string;
  searchMode: SearchMode;
} =>
  Boolean(result.query && result.filters && result.fromDate && result.toDate && result.searchMode);

/**
 * Determines current search mode
 * @param query
 */
export function getSearchMode(query?: Query | AggregateQuery): SearchMode | undefined {
  if (!query) {
    return undefined;
  }

  if (isOfAggregateQueryType(query)) {
    return 'text-based';
  }

  return 'documents';
}
