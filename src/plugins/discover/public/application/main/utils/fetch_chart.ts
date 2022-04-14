/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  search,
  ISearchSource,
  tabifyAggResponse,
} from '../../../../../data/public';
import { getChartAggConfigs, getDimensions } from './index';
import { buildPointSeriesData, Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from './use_saved_search';
import { FetchDeps } from './fetch_all';

interface Result {
  totalHits: number;
  chartData: Chart;
  bucketInterval: TimechartBucketInterval | undefined;
}

export function fetchChart(
  searchSource: ISearchSource,
  {
    abortController,
    appStateContainer,
    data,
    inspectorAdapters,
    searchSessionId,
    savedSearch,
  }: FetchDeps
): Promise<Result> {
  const interval = appStateContainer.getState().interval ?? 'auto';
  const chartAggConfigs = updateSearchSource(searchSource, interval, data);

  const executionContext = {
    description: 'fetch chart data and total hits',
  };

  const fetch$ = searchSource
    .fetch$({
      abortSignal: abortController.signal,
      sessionId: searchSessionId,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('discover.inspectorRequestDataTitleChart', {
          defaultMessage: 'Chart data',
        }),
        description: i18n.translate('discover.inspectorRequestDescriptionChart', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the aggregation data for the chart.',
        }),
      },
      executionContext,
    })
    .pipe(
      filter((res) => isCompleteResponse(res)),
      map((res) => {
        const bucketAggConfig = chartAggConfigs.aggs[1];
        const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
        const dimensions = getDimensions(chartAggConfigs, data);
        const bucketInterval = search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
          ? bucketAggConfig?.buckets?.getInterval()
          : undefined;
        const chartData = buildPointSeriesData(tabifiedData, dimensions!);
        return {
          chartData,
          bucketInterval,
          totalHits: res.rawResponse.hits.total as number,
        };
      })
    );

  return lastValueFrom(fetch$);
}

export function updateSearchSource(
  searchSource: ISearchSource,
  interval: string,
  data: DataPublicPluginStart
) {
  const indexPattern = searchSource.getField('index')!;
  searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern));
  searchSource.setField('size', 0);
  searchSource.setField('trackTotalHits', true);
  const chartAggConfigs = getChartAggConfigs(searchSource, interval, data);
  searchSource.setField('aggs', chartAggConfigs.toDsl());
  searchSource.removeField('sort');
  searchSource.removeField('fields');
  return chartAggConfigs;
}
