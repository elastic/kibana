/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';

import { BehaviorSubject } from 'rxjs';
import { TimechartBucketInterval } from './timechart_header/timechart_header';
import {
  SearchSource,
  tabifyAggResponse,
  AggConfigs,
  IInspectorInfo,
} from '../../../../data/common';
import { applyAggsToSearchSource, getDimensions } from './histogram';
import { SavedSearch } from '../../saved_searches';
import { DataPublicPluginStart, search } from '../../../../data/public';
import { buildPointSeriesData, Chart as IChart } from '../angular/helpers/point_series';
import { fetchStatuses } from './constants';

export type ChartSubject = BehaviorSubject<{
  state: string;
  data?: IChart;
  bucketInterval?: TimechartBucketInterval;
}>;

async function fetch(
  searchSource: SearchSource,
  abortController: AbortController,
  chartAggConfigs: AggConfigs,
  data: DataPublicPluginStart,
  searchSessionId: string,
  inspector: IInspectorInfo
) {
  try {
    const { rawResponse } = await searchSource
      .fetch$({
        abortSignal: abortController.signal,
        sessionId: searchSessionId,
        inspector,
      })
      .toPromise();
    const tabifiedData = tabifyAggResponse(chartAggConfigs, rawResponse);
    const dimensions = getDimensions(chartAggConfigs, data);
    if (!dimensions) {
      return;
    }
    return buildPointSeriesData(tabifiedData, dimensions);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    data.search.showError(error);
  }
}

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
    (abortController: AbortController, searchSessionId: string, inspector) => {
      const searchSource = savedSearch.searchSource.createChild();
      const indexPattern = savedSearch.searchSource.getField('index');
      searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern!));
      searchSource.setField('size', 0);

      const chartAggConfigs = applyAggsToSearchSource(searchSource, interval, data);
      const bucketAggConfig = chartAggConfigs!.aggs[1];

      const newInterval =
        bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
          ? bucketAggConfig.buckets?.getInterval()
          : undefined;

      subject.next({ state: fetchStatuses.UNINITIALIZED });

      return fetch(
        searchSource,
        abortController,
        chartAggConfigs!,
        data,
        searchSessionId,
        inspector
      ).then((result) => {
        subject.next({ state: fetchStatuses.COMPLETE, data: result, bucketInterval: newInterval });
      });
    },
    [data, interval, savedSearch.searchSource, subject]
  );

  return { fetch$: subject, fetch: fetchData };
}
