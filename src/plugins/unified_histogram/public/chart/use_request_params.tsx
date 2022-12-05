/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { connectToQueryState, QueryState } from '@kbn/data-plugin/public';
import { createStateContainer, useContainerState } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useMemo, useRef } from 'react';
import type { UnifiedHistogramRequestContext, UnifiedHistogramServices } from '../types';

export const useRequestParams = ({
  services,
  lastReloadRequestTime,
  request,
}: {
  services: UnifiedHistogramServices;
  lastReloadRequestTime: number | undefined;
  request?: UnifiedHistogramRequestContext;
}) => {
  const { data } = services;

  const queryStateContainer = useRef(
    createStateContainer<QueryState>({
      filters: data.query.filterManager.getFilters(),
      query: data.query.queryString.getQuery(),
      refreshInterval: data.query.timefilter.timefilter.getRefreshInterval(),
      time: data.query.timefilter.timefilter.getTime(),
    })
  ).current;

  const queryState = useContainerState(queryStateContainer);

  useEffect(() => {
    return connectToQueryState(data.query, queryStateContainer, {
      time: true,
      query: true,
      filters: true,
      refreshInterval: true,
    });
  }, [data.query, queryStateContainer]);

  const filters = useMemo(() => queryState.filters ?? [], [queryState.filters]);

  const query = useMemo(
    () => queryState.query ?? data.query.queryString.getDefaultQuery(),
    [data.query.queryString, queryState.query]
  );

  const relativeTimeRange = useMemo(
    () => queryState.time ?? data.query.timefilter.timefilter.getTimeDefaults(),
    [data.query.timefilter.timefilter, queryState.time]
  );

  return { filters, query, relativeTimeRange };
};
