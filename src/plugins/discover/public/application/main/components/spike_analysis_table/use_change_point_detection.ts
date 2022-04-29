/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useReducer, useRef } from 'react';

import { debounce } from 'lodash';

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';

import type { DataView } from '@kbn/data-views-plugin/public';

import type { WindowParameters } from '../chart/get_window_parameters';

// import { callApmApi } from '../../../services/rest/create_call_apm_api';

import { useDiscoverServices } from '../../../../utils/use_discover_services';

import {
  getInitialResponse,
  getChangePointsSortedByScore,
  getReducer,
  CorrelationsProgress,
} from './analysis_hook_utils';
import { generateItemsets } from './generate_itemsets';
import { ItemSetTreeNode } from './itemset_tree';
// import { useFetchParams } from './use_fetch_params';

export interface FieldValuePair {
  fieldName: string;
  // For dynamic fieldValues we only identify fields as `string`,
  // but for example `http.response.status_code` which is part of
  // of the list of predefined field candidates is of type long/number.
  fieldValue: string | number;
}

export interface HistogramItem {
  doc_count: number;
  key: number;
  key_as_string: string;
}

export interface ChangePoint extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
}
export interface ChangePointHistogram extends FieldValuePair {
  histogram: HistogramItem[];
}

export interface TopValueBucket {
  key: string | number;
  doc_count: number;
}

export interface TopValuesStats {
  count?: number;
  fieldName: string;
  topValues: TopValueBucket[];
  topValuesSampleSize: number;
  isTopValuesSampled?: boolean;
  topValuesSamplerShardSize?: number;
}

export interface NumericFieldStats extends TopValuesStats {
  min: number;
  max: number;
  avg: number;
  median?: number;
}

export type KeywordFieldStats = TopValuesStats;

export interface BooleanFieldStats {
  fieldName: string;
  count: number;
  [key: string]: number | string;
}

export type FieldStats = NumericFieldStats | KeywordFieldStats | BooleanFieldStats;

export interface ChangePointsResponseTree {
  root: ItemSetTreeNode;
  minQualityRatio: number;
  parentQualityWeight: number;
  parentSimilarityWeight: number;
}
export type FrequentItemsHistograms = Record<string, HistogramItem[]>;
type HistogramResponse = Array<{
  data: HistogramItem[];
  interval: number;
  stats: [number, number];
}>;
export interface ChangePointsResponse {
  ccsWarning: boolean;
  changePoints?: ChangePoint[];
  changePointsHistograms?: ChangePointHistogram[];
  fieldStats?: FieldStats[];
  overallTimeSeries?: HistogramResponse;
  tree?: ChangePointsResponseTree;
  frequentItemsHistograms?: FrequentItemsHistograms;
}

export type Items = Record<string, string[]>;
interface ItemsMeta {
  buckets: Array<{ key: Items; doc_count: number; support: number }>;
}
export type FrequentItems = ItemsMeta;

export const DEBOUNCE_INTERVAL = 20;

export function useChangePointDetection(
  dataView: DataView,
  searchStrategyParams?: WindowParameters
) {
  const { data } = useDiscoverServices();

  const discoverQuery = useMemo(() => data.query.getEsQuery(dataView), [data.query, dataView]);

  // const fetchParams = useFetchParams();

  const { title: dataViewTitle } = dataView;
  const timestampField = dataView.getTimeField()?.name;

  // ?kuery=&rangeFrom=now-1y%2Fd&rangeTo=now&environment=ENVIRONMENT_ALL&transactionName=PUT%20%2Fapi%2Fsecurity%2Frole%2F%3F&transactionType=request&comparisonEnabled=true&comparisonType=period&latencyAggregationType=avg&transactionId=54c7151a517c62fa&traceId=6ee0f571e2d75cf83ca1767f748cb2dc
  const fetchParams = useMemo(
    () => ({
      indexPatternTitle: dataViewTitle,
      start: '1970-02-09T23:00:00.000Z',
      end: '2100-02-09T23:00:00.000Z',
      kuery: '',
      environment: 'ENVIRONMENT_ALL',
      // serviceName: 'myServiceName',
      // transactionName: 'PUT /api/security/role/',
      // transactionType: 'request',
    }),
    [dataViewTitle]
  );

  // This use of useReducer (the dispatch function won't get reinstantiated
  // on every update) and debounce avoids flooding consuming components with updates.
  // `setResponse.flush()` can be used to enforce an update.
  const [response, setResponseUnDebounced] = useReducer(
    getReducer<ChangePointsResponse & CorrelationsProgress>(),
    getInitialResponse()
  );
  const setResponse = useMemo(() => debounce(setResponseUnDebounced, DEBOUNCE_INTERVAL), []);

  const abortCtrl = useRef(new AbortController());

  const startFetch = useCallback(async () => {
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    setResponse({
      ...getInitialResponse(),
      isRunning: true,
      // explicitly set these to undefined to override a possible previous state.
      error: undefined,
      loadingState: 'Loading ...',
      changePoints: undefined,
      fieldStats: undefined,
      overallTimeSeries: undefined,
      tree: undefined,
    });
    setResponse.flush();

    try {
      if (!searchStrategyParams) {
        return;
      }
      // `responseUpdate` will be enriched with additional data with subsequent
      // calls to the overall histogram, field candidates, field value pairs, correlation results
      // and histogram data for statistically significant results.
      const responseUpdate: ChangePointsResponse = {
        ccsWarning: false,
      };

      // loaded += LOADED_OVERALL_HISTOGRAM;

      const stream = await fetch('/api/ml/data_visualizer/spike_analysis', {
        signal: abortCtrl.current.signal,
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'stream',
        },
        method: 'POST',
        body: JSON.stringify({
          ...fetchParams,
          discoverQuery,
          timestampField,
          ...searchStrategyParams,
        }),
      });

      if (stream.body !== null) {
        const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();

        let partial = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const full = `${partial}${value}`;
          const parts = full.split('\n');
          const last = parts.pop();

          partial = last ?? '';

          console.log(
            'parts',
            parts.map((d) => JSON.parse(d))
          );

          const parsed = parts.reduce((p, cRaw) => {
            try {
              const c = JSON.parse(cRaw);

              Object.entries(c).forEach(([key, value]) => {
                if (Array.isArray(p[key])) {
                  p[key].push(...value);
                } else {
                  p[key] = value;
                }
              });

              return p;
            } catch (e) {
              console.error('failed JSON parsing', p, e);
            }
          }, responseUpdate);

          console.log('parsed', { ...parsed });

          setResponse(parsed);
        }

        console.log('Response fully received');

        const { itemsets, itemSetTree } = generateItemsets(
          responseUpdate.orderedFields,
          responseUpdate.frequentItems,
          responseUpdate.changePoints ?? [],
          responseUpdate.totalDocCount
        );

        setResponse({
          ...responseUpdate,
          tree: itemSetTree,
        });
      }
    } catch (e) {
      if (!abortCtrl.current.signal.aborted) {
        const err = e as Error | IHttpFetchError<ResponseErrorBody>;
        setResponse({
          error: 'response' in err ? err.body?.message ?? err.response?.statusText : err.message,
          isRunning: false,
        });
        setResponse.flush();
      }
    }
  }, [discoverQuery, fetchParams, setResponse, searchStrategyParams, timestampField]);

  const cancelFetch = useCallback(() => {
    abortCtrl.current.abort();
    setResponse({
      isRunning: false,
    });
    setResponse.flush();
  }, [setResponse]);

  const { error, loaded, loadingState, isRunning, ...returnedResponse } = response;
  const progress = useMemo(
    () => ({
      error,
      loaded: Math.round(loaded * 100) / 100,
      loadingState,
      isRunning,
    }),
    [error, loaded, loadingState, isRunning]
  );

  return {
    progress,
    response: returnedResponse,
    startFetch,
    cancelFetch,
  };
}
