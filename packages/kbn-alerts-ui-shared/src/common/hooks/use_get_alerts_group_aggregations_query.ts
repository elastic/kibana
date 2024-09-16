/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
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
    ruleTypeIds: string[];
    groupByField: string;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    filters?: QueryDslQueryContainer[];
    sort?: SortCombinations[];
    pageIndex?: number;
    pageSize?: number;
  };
}

/**
 * Fetches alerts aggregations for a given groupByField.
 *
 * Some default aggregations are applied:
 * - `groupByFields`, to get the buckets based on the provided grouping field,
 *   - `unitsCount`, to count the number of alerts in each bucket,
 * - `unitsCount`, to count the total number of alerts targeted by the query,
 * - `groupsCount`, to count the total number of groups.
 *
 * The provided `aggregations` are applied within `groupByFields`. Here the `groupByField` runtime
 * field can be used to perform grouping-based aggregations.
 * `groupByField` buckets computed over a field with a null/absent value are marked with the
 * `isNullGroup` flag set to true and their key is set to the `--` string.
 *
 * Applies alerting RBAC through ruleTypeIds.
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
          'alertsUIShared.hooks.useGetAlertsGroupAggregationsQuery.unableToFetchAlertsGroupingAggregations',
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
