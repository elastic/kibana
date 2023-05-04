/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import { getResolvedDateRange } from '../utils/get_resolved_date_range';

/**
 * Hook params
 */
export interface QuerySubscriberParams {
  data: DataPublicPluginStart;
}

/**
 * Result from the hook
 */
export interface QuerySubscriberResult {
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
}

/**
 * Memorizes current query, filters and absolute date range
 * @param data
 * @public
 */
export const useQuerySubscriber = ({ data }: QuerySubscriberParams) => {
  const timefilter = data.query.timefilter.timefilter;
  const [result, setResult] = useState<QuerySubscriberResult>(() => {
    const state = data.query.getState();
    const dateRange = getResolvedDateRange(timefilter);
    return {
      query: state?.query,
      filters: state?.filters,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    };
  });

  useEffect(() => {
    const subscription = data.search.session.state$.subscribe((sessionState) => {
      const dateRange = getResolvedDateRange(timefilter);
      setResult((prevState) => ({
        ...prevState,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      }));
    });

    return () => subscription.unsubscribe();
  }, [setResult, timefilter, data.search.session.state$]);

  useEffect(() => {
    const subscription = data.query.state$.subscribe(({ state, changes }) => {
      if (changes.query || changes.filters) {
        setResult((prevState) => ({
          ...prevState,
          query: state.query,
          filters: state.filters,
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
} => Boolean(result.query && result.filters && result.fromDate && result.toDate);
