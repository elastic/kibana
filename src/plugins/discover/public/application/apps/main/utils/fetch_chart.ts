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
import { SavedSearchData } from '../services/use_saved_search';
import { AppState } from '../services/discover_state';
import { ReduxLikeStateContainer } from '../../../../../../kibana_utils/common';
import { sendErrorMsg, sendLoadingMsg } from '../services/use_saved_search_messages';

export function fetchChart(
  data$: SavedSearchData,
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
  const { charts$, totalHits$ } = data$;

  const interval = appStateContainer.getState().interval ?? 'auto';
  const chartAggConfigs = updateSearchSource(searchSource, interval, data);

  sendLoadingMsg(charts$);
  sendLoadingMsg(totalHits$);

  const executionContext = {
    type: 'application',
    name: 'discover',
    description: 'fetch chart data and total hits',
    url: window.location.pathname,
    id: '',
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
    .pipe(filter((res) => isCompleteResponse(res)));

  fetch$.subscribe(
    (res) => {
      try {
        const totalHitsNr = res.rawResponse.hits.total as number;
        totalHits$.next({ fetchStatus: FetchStatus.COMPLETE, result: totalHitsNr });
        onResults(totalHitsNr > 0);

        const bucketAggConfig = chartAggConfigs.aggs[1];
        const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
        const dimensions = getDimensions(chartAggConfigs, data);
        const bucketInterval = search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
          ? bucketAggConfig?.buckets?.getInterval()
          : undefined;
        const chartData = buildPointSeriesData(tabifiedData, dimensions!);
        charts$.next({
          fetchStatus: FetchStatus.COMPLETE,
          chartData,
          bucketInterval,
        });
      } catch (e) {
        charts$.next({
          fetchStatus: FetchStatus.ERROR,
          error: e,
        });
      }
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      sendErrorMsg(charts$, error);
      sendErrorMsg(totalHits$, error);
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
  searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern));
  searchSource.setField('size', 0);
  searchSource.setField('trackTotalHits', true);
  const chartAggConfigs = getChartAggConfigs(searchSource, interval, data);
  searchSource.setField('aggs', chartAggConfigs.toDsl());
  searchSource.removeField('sort');
  searchSource.removeField('fields');
  return chartAggConfigs;
}
