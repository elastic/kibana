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

export function fetchChart({
  abortController,
  data,
  inspectorAdapters,
  interval = 'auto',
  searchSource,
  searchSessionId,
}: {
  abortController: AbortController;
  data: DataPublicPluginStart;
  inspectorAdapters: Adapters;
  interval: string;
  searchSource: SearchSource;
  searchSessionId: string;
}): Observable<{ chartData: Chart; bucketInterval?: TimechartBucketInterval } | undefined> {
  const childSearchSource = searchSource.createChild();
  const indexPattern = searchSource.getField('index')!;
  childSearchSource.setField(
    'filter',
    data.query.timefilter.timefilter.createFilter(indexPattern!)
  );
  childSearchSource.setField('size', 0);
  const chartAggConfigs = getChartAggConfigs(childSearchSource, interval, data);
  childSearchSource.setField('aggs', chartAggConfigs.toDsl());

  return childSearchSource
    .fetch$({
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
    })
    .pipe(filter((res) => isCompleteResponse(res)))
    .pipe(
      map((res) => {
        const bucketAggConfig = chartAggConfigs.aggs[1];
        const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
        const dimensions = getDimensions(chartAggConfigs, data);
        if (dimensions) {
          return {
            chartData: buildPointSeriesData(tabifiedData, dimensions),
            bucketInterval: search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
              ? bucketAggConfig?.buckets?.getInterval()
              : undefined,
          };
        }
        return undefined;
      })
    );
}
