/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs/operators';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  search,
  ISearchSource,
  tabifyAggResponse,
  tabifyAggRandomSamplingResponse,
} from '../../../../../data/public';
import { getChartAggConfigs, getDimensions } from './index';
import {
  buildPointSeriesData,
  buildPointSeriesDataRandomSampling,
  Chart,
} from '../components/chart/point_series';
import { TimechartBucketInterval } from './use_saved_search';
import { FetchDeps } from './fetch_all';
import { getChartAggWithRandomSamplerConfigs } from './get_chart_agg_configs';
import { getDimensionsRandomSampling } from './get_dimensions';

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

  return fetch$.toPromise();
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

export function fetchChartWithRandomSampling(
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

  const chartAggConfigs = updateRandomSamplingSearchSource(
    searchSource,
    interval,
    data,
    appStateContainer.getState().samplingProbability ?? 0.1
  );

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
        const tabifiedData = tabifyAggRandomSamplingResponse(chartAggConfigs, res.rawResponse);
        const dimensions = getDimensionsRandomSampling(chartAggConfigs, data);
        const bucketInterval = search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
          ? bucketAggConfig?.buckets?.getInterval()
          : undefined;

        const chartData = buildPointSeriesDataRandomSampling(tabifiedData, dimensions!);
        return {
          chartData,
          bucketInterval,
          totalHits: res.rawResponse.hits.total as number,
        };
      })
    );

  return fetch$.toPromise();
}

export function updateRandomSamplingSearchSource(
  searchSource: ISearchSource,
  interval: string,
  data: DataPublicPluginStart,
  samplingProbability: number
) {
  const indexPattern = searchSource.getField('index')!;
  searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern));
  searchSource.setField('size', 0);
  searchSource.setField('trackTotalHits', true);
  const chartAggConfigs = getChartAggWithRandomSamplerConfigs(
    searchSource,
    interval,
    data,
    samplingProbability
  );
  searchSource.setField('aggs', chartAggConfigs.toDsl());
  searchSource.removeField('sort');
  searchSource.removeField('fields');
  return chartAggConfigs;
}
