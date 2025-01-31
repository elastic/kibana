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
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { GroupingQuery } from '@kbn/grouping/src';

export interface UseGetDataGroupAggregationsQueryProps {
  data: DataPublicPluginStart;
  dataView: DataView;
  aggregationsQuery: GroupingQuery;
  toasts: ToastsStart;
  enabled?: boolean;
}

export const useGetDataGroupAggregationsQuery = <T>({
  data,
  dataView,
  aggregationsQuery,
  toasts,
  enabled = true,
}: UseGetDataGroupAggregationsQueryProps) => {
  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate(
          'discover.grouping.hooks.useGetAlertsGroupAggregationsQuery.unableToFetchAlertsGroupingAggregations',
          {
            defaultMessage: 'Unable to fetch data grouping aggregations',
          }
        )
      );
    }
  };

  return useQuery({
    queryKey: ['getDataGroupAggregations', JSON.stringify(aggregationsQuery)],
    queryFn: () =>
      lastValueFrom(
        data.search.search({
          params: {
            index: dataView.getIndexPattern(),
            size: 0,
            track_total_hits: true,
            body: {
              ...aggregationsQuery,
            },
          },
        })
      ),
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    enabled,
  });
};
