/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import moment from 'moment';
import { Subject } from 'rxjs';
import { applyAggsToSearchSource } from './apply_aggs_to_search_source';
import { AggConfigs, SearchSource, tabifyAggResponse } from '../../../../../data/common';
import { getDimensions } from './get_dimensions';
import { discoverResponseHandler } from '../../angular/response_handler';
import { DataPublicPluginStart, search } from '../../../../../data/public';
import { SavedSearch } from '../../../saved_searches';

async function fetch(
  searchSource: SearchSource,
  abortController: AbortController,
  chartAggConfigs: AggConfigs,
  data: DataPublicPluginStart
) {
  try {
    const currentSearchSessionId = data.search.session.getSessionId();
    const response = await searchSource.fetch({
      abortSignal: abortController.signal,
      sessionId: currentSearchSessionId,
    });
    const tabifiedData = tabifyAggResponse(chartAggConfigs, response);
    const dimensions = getDimensions(chartAggConfigs, data);
    if (!dimensions) {
      return;
    }

    return discoverResponseHandler(tabifiedData, dimensions);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
  }
}

export function useChartData({
  savedSearch,
  data,
  interval = 'auto',
  hideChart,
  fetch$,
}: {
  savedSearch: SavedSearch;
  data: DataPublicPluginStart;
  interval: string;
  hideChart: boolean;
  fetch$: Subject<undefined>;
}) {
  const abortControllerRef = useRef<AbortController | undefined>();
  const [chartData, setChartData] = useState<undefined | any>(undefined);
  const [bucketInterval, setBucketInterval] = useState<any>(undefined);
  const [usedInterval, setUsedInterval] = useState<string>(interval);
  const [usedHideChart, sedUsedHideCart] = useState<boolean>(hideChart);

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const fetchData = useCallback(() => {
    if (hideChart) {
      setChartData(undefined);
      return;
    }
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    fetch(searchSource, abortControllerRef.current, chartAggConfigs!, data).then((result: any) => {
      setBucketInterval(newInterval);
      setChartData(result);
    });
  }, [data, hideChart, interval, savedSearch.searchSource]);

  useEffect(() => {
    const subscription = fetch$.subscribe(() => {
      fetchData();
    });
    return () => {
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetch$, fetchData]);

  useEffect(() => {
    if (usedInterval !== interval) {
      setUsedInterval(interval);
      fetchData();
    }
  }, [usedInterval, interval, fetchData]);

  useEffect(() => {
    if (hideChart !== usedHideChart) {
      sedUsedHideCart(hideChart);
      fetchData();
    }
  }, [hideChart, usedHideChart, sedUsedHideCart, fetchData]);

  return {
    chartData,
    bucketInterval,
    timefilterUpdateHandler,
  };
}
