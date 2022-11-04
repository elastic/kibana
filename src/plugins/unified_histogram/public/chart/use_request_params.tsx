/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { connectToQueryState, QueryState } from '@kbn/data-plugin/public';
import { createStateContainer, useContainerState } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useMemo } from 'react';
import type { UnifiedHistogramRequestContext, UnifiedHistogramServices } from '../types';

export const useRequestParams = ({
  services,
  request,
}: {
  services: UnifiedHistogramServices;
  request?: UnifiedHistogramRequestContext;
}) => {
  const { data } = services;

  const queryStateContainer = useMemo(() => {
    return createStateContainer<QueryState>({
      filters: data.query.filterManager.getFilters(),
      query: data.query.queryString.getQuery(),
      refreshInterval: data.query.timefilter.timefilter.getRefreshInterval(),
      time: data.query.timefilter.timefilter.getTime(),
    });
  }, [data.query.filterManager, data.query.queryString, data.query.timefilter.timefilter]);

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

  // We need to update the absolute time range whenever the relative
  // time range changes, or when the lastReloadRequestTime changes
  const timeRange = useMemo(
    () => data.query.timefilter.timefilter.getAbsoluteTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.query.timefilter.timefilter, queryState.time, request?.lastReloadRequestTime]
  );

  return { filters, query, timeRange };
};
