/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter } from 'rxjs/operators';
import { SearchSource } from '../../../../../../data/common/search/search_source/search_source';
import { tabifyAggResponse } from '../../../../../../data/common/search/tabify/tabify';
import { isCompleteResponse } from '../../../../../../data/common/search/utils';
import { search } from '../../../../../../data/public';
import type { DataPublicPluginStart } from '../../../../../../data/public/types';
import type { Adapters } from '../../../../../../inspector/common/adapters/types';
import type { ReduxLikeStateContainer } from '../../../../../../kibana_utils/common/state_containers/types';
import { FetchStatus } from '../../../types';
import { buildPointSeriesData } from '../components/chart/point_series';
import type { AppState } from '../services/discover_state';
import type { SavedSearchData } from '../services/use_saved_search';
import { sendErrorMsg, sendLoadingMsg } from '../services/use_saved_search_messages';
import { getChartAggConfigs } from './get_chart_agg_configs';
import { getDimensions } from './get_dimensions';

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
