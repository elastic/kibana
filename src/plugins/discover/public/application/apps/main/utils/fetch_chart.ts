/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter } from 'rxjs/operators';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  search,
  SearchSource,
} from '../../../../../../data/public';
import { Adapters } from '../../../../../../inspector';
import { getChartAggConfigs, getDimensions } from './index';
import { tabifyAggResponse } from '../../../../../../data/common';
import { buildPointSeriesData } from '../components/chart/point_series';
import { FetchStatus } from '../../../types';
import { DataCharts$ } from '../services/use_saved_search';
import { AppState } from '../services/discover_state';
import { ReduxLikeStateContainer } from '../../../../../../kibana_utils/common';
import { sendErrorMsg, sendLoadingMsg } from '../services/use_saved_search_messages';

export function fetchChart(
  dataCharts$: DataCharts$,
  searchSource: SearchSource,
  {
    abortController,
    appStateContainer,
    data,
    inspectorAdapters,
    onResults,
    searchSessionId,
  }: {
    abortController: AbortController;
    appStateContainer: ReduxLikeStateContainer<AppState>;
    data: DataPublicPluginStart;
    inspectorAdapters: Adapters;
    onResults: (foundDocuments: boolean) => void;
    searchSessionId: string;
  }
) {
  const interval = appStateContainer.getState().interval ?? 'auto';
  const chartAggConfigs = updateSearchSource(searchSource, interval, data);

  sendLoadingMsg(dataCharts$);

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
    })
    .pipe(filter((res) => isCompleteResponse(res)));

  fetch$.subscribe(
    (res) => {
      try {
        const bucketAggConfig = chartAggConfigs.aggs[1];
        const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
        const dimensions = getDimensions(chartAggConfigs, data);
        const bucketInterval = search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
          ? bucketAggConfig?.buckets?.getInterval()
          : undefined;
        const chartData = buildPointSeriesData(tabifiedData, dimensions!);
        onResults(true);
        dataCharts$.next({
          fetchStatus: FetchStatus.COMPLETE,
          chartData,
          bucketInterval,
        });
      } catch (e) {
        dataCharts$.next({
          fetchStatus: FetchStatus.ERROR,
          error: e,
        });
      }
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      sendErrorMsg(dataCharts$, error);
    }
  );
  return fetch$;
}

export function updateSearchSource(
  searchSource: SearchSource,
  interval: string,
  data: DataPublicPluginStart
) {
  const indexPattern = searchSource.getField('index')!;
  searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern!));
  searchSource.setField('size', 0);
  searchSource.setField('trackTotalHits', false);
  const chartAggConfigs = getChartAggConfigs(searchSource, interval, data);
  searchSource.setField('aggs', chartAggConfigs.toDsl());
  return chartAggConfigs;
}
