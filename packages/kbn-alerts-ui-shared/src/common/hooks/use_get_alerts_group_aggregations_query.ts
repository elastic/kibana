/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

export interface UseGetAlertsGroupAggregationsQueryProps {
  http: HttpStart;
  toasts: ToastsStart;
  enabled?: boolean;
  params: {
    featureIds: AlertConsumers[];
    groupByField: string;
    aggregations: Record<string, AggregationsAggregationContainer>;
    filters?: QueryDslQueryContainer[];
    sort?: SortCombinations[];
    pageIndex?: number;
    pageSize?: number;
  };
}

/**
 * Fetches alerts aggregations for a given groupByField
 *
 * Applies alerting RBAC thorough featureIds
 */
export const useGetAlertsGroupAggregationsQuery = <T>({
  http,
  toasts,
  enabled = true,
  params,
}: UseGetAlertsGroupAggregationsQueryProps) => {
  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate(
          'alertsUIShared.hooks.useFindAlertsQuery.unableToFetchAlertsGroupingAggregations',
          {
            defaultMessage: 'Unable to fetch alerts grouping aggregations',
          }
        )
      );
    }
  };

  return useQuery({
    queryKey: ['getAlertsGroupAggregations', JSON.stringify(params)],
    queryFn: () =>
      http.post<SearchResponseBody<{}, T>>(`${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`, {
        body: JSON.stringify(params),
      }),
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled,
  });
};
