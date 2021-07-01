/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  search,
  SearchSource,
} from '../../../../../../data/public';
import { Adapters } from '../../../../../../inspector';
import { getChartAggConfigs, getDimensions } from '../utils';
import { tabifyAggResponse } from '../../../../../../data/common';
import { buildPointSeriesData, Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';
import { FetchStatus } from '../../../types';
import { SavedSearchChartsSubject } from './use_saved_search';

export function fetchChart(
  dataCharts$: SavedSearchChartsSubject,

  {
    abortController,
    data,
    inspectorAdapters,
    interval = 'auto',
    onResults,
    searchSource,
    searchSessionId,
  }: {
    abortController: AbortController;
    data: DataPublicPluginStart;
    inspectorAdapters: Adapters;
    interval: string;
    onResults: (isEmpty: boolean) => void;
    searchSource: SearchSource;
    searchSessionId: string;
  }
): Observable<{ chartData: Chart; bucketInterval?: TimechartBucketInterval } | undefined> {
  const childSearchSource = searchSource.createCopy();
  const indexPattern = searchSource.getField('index')!;
  childSearchSource.setField(
    'filter',
    data.query.timefilter.timefilter.createFilter(indexPattern!)
  );
  childSearchSource.setField('size', 0);
  childSearchSource.setField('trackTotalHits', false);
  const chartAggConfigs = getChartAggConfigs(childSearchSource, interval, data);
  childSearchSource.setField('aggs', chartAggConfigs.toDsl());

  const fetch$ = childSearchSource
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
    .pipe(filter((res) => isCompleteResponse(res)))
    .pipe(
      map((res) => {
        const bucketAggConfig = chartAggConfigs.aggs[1];
        const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
        const dimensions = getDimensions(chartAggConfigs, data);
        if (dimensions) {
          const chartData = buildPointSeriesData(tabifiedData, dimensions);
          onResults(false);
          return {
            chartData,
            bucketInterval: search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
              ? bucketAggConfig?.buckets?.getInterval()
              : undefined,
          };
        }
        return undefined;
      })
    );

  fetch$.subscribe(
    (res) => {
      if (res) {
        dataCharts$.next({
          fetchStatus: FetchStatus.COMPLETE,
          chartData: res.chartData,
          bucketInterval: res.bucketInterval,
        });
      }
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      dataCharts$.next({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
    }
  );
  return fetch$;
}
