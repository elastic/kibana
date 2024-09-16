/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';

import { SetOptional } from 'type-fest';
import { searchAlerts, type SearchAlertsParams } from '../apis/search_alerts/search_alerts';
import { DEFAULT_ALERTS_PAGE_SIZE } from '../constants';
import { AlertsQueryContext } from '../contexts/alerts_query_context';

export type UseSearchAlertsQueryParams = SetOptional<
  Omit<SearchAlertsParams, 'signal'>,
  'query' | 'sort' | 'pageIndex' | 'pageSize'
>;

export const queryKeyPrefix = ['alerts', searchAlerts.name];

/**
 * Query alerts
 *
 * When testing components that depend on this hook, prefer mocking the {@link searchAlerts} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useSearchAlertsQuery = ({ data, ...params }: UseSearchAlertsQueryParams) => {
  const {
    ruleTypeIds,
    fields,
    query = {
      bool: {},
    },
    sort = [
      {
        '@timestamp': 'desc',
      },
    ],
    runtimeMappings,
    pageIndex = 0,
    pageSize = DEFAULT_ALERTS_PAGE_SIZE,
  } = params;
  return useQuery({
    queryKey: queryKeyPrefix.concat(JSON.stringify(params)),
    queryFn: ({ signal }) =>
      searchAlerts({
        data,
        signal,
        ruleTypeIds,
        fields,
        query,
        sort,
        runtimeMappings,
        pageIndex,
        pageSize,
      }),
    refetchOnWindowFocus: false,
    context: AlertsQueryContext,
    enabled: ruleTypeIds.length > 0,
    // To avoid flash of empty state with pagination, see https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries#better-paginated-queries-with-placeholderdata
    keepPreviousData: true,
    placeholderData: {
      total: -1,
      alerts: [],
      oldAlertsData: [],
      ecsAlertsData: [],
    },
  });
};
