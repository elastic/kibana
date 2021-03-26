/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { applyAggsToSearchSource } from './apply_aggs_to_search_source';
import { AggConfigs, SearchSource, tabifyAggResponse } from '../../../../../data/common';
import { getDimensions } from './get_dimensions';
import { discoverResponseHandler } from '../../angular/response_handler';
import { search } from '../../../../../data/public';

async function fetch(
  volatileSearchSource: SearchSource,
  abortController: AbortController,
  chartAggConfigs: AggConfigs,
  data: any
) {
  try {
    const response = await volatileSearchSource.fetch({
      abortSignal: abortController.signal,
    });
    return onResults(response, chartAggConfigs, data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
  }
}

function onResults(resp: any, chartAggConfigs: any, data: any) {
  const tabifiedData = tabifyAggResponse(chartAggConfigs, resp);

  return discoverResponseHandler(tabifiedData, getDimensions(chartAggConfigs, data));
}

export function useChartData(props: any) {
  const [chartData, setChartData] = useState<undefined | any>(undefined);
  const [triggerFetch, setTriggerFetch] = useState<string>('');
  const [bucketInterval, setBucketInterval] = useState<any>(undefined);

  useEffect(() => {
    if (props.hideChart) {
      setChartData(undefined);
      return;
    }
    const abortController = new AbortController();
    const searchSource = props.savedSearch.searchSource.createCopy();
    searchSource
      .setField('index', props.indexPattern)
      .setField('query', props.data.query.queryString.getQuery() || null)
      .setField('filter', props.data.query.filterManager.getFilters())
      .setField('size', 0);

    searchSource.setField('filter', () => {
      return props.data.query.timefilter.timefilter.createFilter(props.indexPattern);
    });

    const chartAggConfigs = applyAggsToSearchSource(
      true,
      searchSource,
      props.interval,
      props.indexPattern,
      props.data
    );
    const bucketAggConfig = chartAggConfigs!.aggs[1];

    const newInterval =
      bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)
        ? bucketAggConfig.buckets?.getInterval()
        : undefined;

    fetch(searchSource, abortController, chartAggConfigs!, props.data).then((result: any) => {
      setBucketInterval(newInterval);
      setChartData(result);
    });
    return () => {
      abortController.abort();
    };
  }, [
    props.savedSearch,
    props.data,
    props.searchSource,
    props.indexPattern,
    props.interval,
    props.hideChart,
    triggerFetch,
  ]);

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      props.data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [props.data]
  );
  useEffect(() => {
    const subscription = props.fetch$.subscribe(() => {
      setTriggerFetch(new Date().toJSON());
    });
    return () => subscription.unsubscribe();
  }, [props.fetch$]);

  return {
    chartData,
    bucketInterval,
    timefilterUpdateHandler,
  };
}
