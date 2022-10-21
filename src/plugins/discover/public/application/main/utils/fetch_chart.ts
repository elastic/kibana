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
import { DataPublicPluginStart, isCompleteResponse, ISearchSource } from '@kbn/data-plugin/public';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getChartAggConfigs } from '@kbn/unified-histogram-plugin/public';
import { FetchDeps } from './fetch_all';

interface Result {
  totalHits: number;
  response: SearchResponse;
}

export function fetchChart(
  searchSource: ISearchSource,
  interval: string,
  { abortController, data, inspectorAdapters, searchSessionId }: FetchDeps
): Promise<Result> {
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
      map((res) => ({
        response: res.rawResponse,
        totalHits: res.rawResponse.hits.total as number,
      }))
    );

  return lastValueFrom(fetch$);
}

export function updateSearchSource(
  searchSource: ISearchSource,
  timeInterval: string,
  data: DataPublicPluginStart
) {
  const dataView = searchSource.getField('index')!;
  searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(dataView));
  searchSource.setField('size', 0);
  searchSource.setField('trackTotalHits', true);
  const chartAggConfigs = getChartAggConfigs({ dataView, timeInterval, data });
  searchSource.setField('aggs', chartAggConfigs.toDsl());
  searchSource.removeField('sort');
  searchSource.removeField('fields');
  return chartAggConfigs;
}
