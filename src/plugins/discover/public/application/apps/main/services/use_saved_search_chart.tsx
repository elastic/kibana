/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';
import { tabifyAggResponse } from '../../../../../../data/common';

import { applyAggsToSearchSource, getDimensions } from '../utils';
import { SavedSearch } from '../../../../saved_searches';
import { DataPublicPluginStart, search } from '../../../../../../data/public';
import { buildPointSeriesData, Chart as IChart } from '../components/chart/point_series';
import { fetchStatuses } from '../../../components/constants';
import { Adapters } from '../../../../../../inspector';

export type ChartSubject = BehaviorSubject<{
  state: string;
  data?: IChart;
  bucketInterval?: TimechartBucketInterval;
}>;

export function useSavedSearchChart({
  savedSearch,
  data,
  interval = 'auto',
}: {
  savedSearch: SavedSearch;
  data: DataPublicPluginStart;
  interval: string;
}) {
  const subject: ChartSubject = useMemo(
    () => new BehaviorSubject({ state: fetchStatuses.UNINITIALIZED }),
    []
  );

  const fetchData = useCallback(
    ({
      abortController,
      searchSessionId,
      inspectorAdapters,
    }: {
      abortController: AbortController;
      searchSessionId: string;
      inspectorAdapters: Adapters;
    }) => {
      const searchSource = savedSearch.searchSource.createChild();
      const indexPattern = savedSearch.searchSource.getField('index');
      searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern!));
      searchSource.setField('size', 0);
      const chartAggConfigs = applyAggsToSearchSource(searchSource, interval, data);

      subject.next({ state: fetchStatuses.UNINITIALIZED });

      const searchSourceFetch$ = searchSource.fetch$({
        abortSignal: abortController.signal,
        sessionId: searchSessionId,
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitleChart', {
            defaultMessage: 'chart data',
          }),
          description: i18n.translate('discover.inspectorRequestDescriptionChart', {
            defaultMessage:
              'This request queries Elasticsearch to fetch the chart data for the search.',
          }),
        },
      });

      searchSourceFetch$.subscribe({
        next: ({ rawResponse }) => {
          const bucketAggConfig = chartAggConfigs!.aggs[1];
          const tabifiedData = tabifyAggResponse(chartAggConfigs, rawResponse);
          const dimensions = getDimensions(chartAggConfigs, data);
          if (!dimensions) {
            return;
          }
          const newInterval =
            bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
              ? bucketAggConfig.buckets?.getInterval()
              : undefined;
          const pointSeriesData = buildPointSeriesData(tabifiedData, dimensions);
          subject.next({
            state: fetchStatuses.COMPLETE,
            data: pointSeriesData,
            bucketInterval: newInterval,
          });
          return pointSeriesData;
        },
      });
      return searchSourceFetch$;
    },
    [data, interval, savedSearch.searchSource, subject]
  );

  return { fetch$: subject, fetch: fetchData };
}
