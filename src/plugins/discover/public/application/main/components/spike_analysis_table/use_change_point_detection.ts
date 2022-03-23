/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useReducer, useRef } from 'react';

import { chunk, debounce } from 'lodash';

import { asyncForEach } from '@kbn/std';

import { IHttpFetchError, ResponseErrorBody } from 'src/core/public';

import type { DataView } from '../../../../../../data_views/public';

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

interface HistogramItem {
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
export interface ChangePointsResponse {
  ccsWarning: boolean;
  changePoints?: ChangePoint[];
  fieldStats?: FieldStats[];
  overallTimeSeries?: HistogramItem[];
  tree?: ChangePointsResponseTree;
}

type HistogramResponse = Array<{
  data: HistogramItem[];
  interval: number;
  stats: [number, number];
}>;

export type Items = Record<string, string[]>;
interface ItemsMeta {
  buckets: Array<{ key: Items; doc_count: number; support: number }>;
}
export type FrequentItems = ItemsMeta;

export const DEBOUNCE_INTERVAL = 100;

// Overall progress is a float from 0 to 1.
// const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_FIELD_CANDIDATES = 0.05;
const LOADED_DONE = 1;
const PROGRESS_STEP_P_VALUES = 0.6;
const PROGRESS_STEP_HISTOGRAMS = 0.1;
const PROGRESS_STEP_FREQUENT_ITEMS = 0.1;

export function useChangePointDetection(
  dataView: DataView,
  searchStrategyParams?: WindowParameters
) {
  const {
    data,
    core: { http },
  } = useDiscoverServices();

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
    let loaded = 0;
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

      setResponse({
        ...responseUpdate,
        loaded,
        loadingState: 'Loading field candidates.',
      });
      setResponse.flush();

      const { fieldCandidates } = await http.get<{ fieldCandidates: string[] }>(
        '/internal/apm/correlations/field_candidates',
        {
          signal: abortCtrl.current.signal,
          query: fetchParams,
        }
      );

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      loaded += LOADED_FIELD_CANDIDATES;
      setResponse({
        loaded,
        loadingState: `Identified ${fieldCandidates.length} field candidates.`,
      });
      setResponse.flush();

      const changePoints: ChangePoint[] = [];
      const fieldsToSample = new Set<string>();
      const chunkSize = 10;

      const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidatesChunk of fieldCandidatesChunks) {
        const { changePoints: pValues } = await http.post<{
          changePoints: ChangePoint[];
        }>('/internal/apm/correlations/change_point_p_values', {
          signal: abortCtrl.current.signal,
          body: JSON.stringify({
            ...fetchParams,
            timestampField,
            fieldCandidates: fieldCandidatesChunk,
            ...searchStrategyParams,
          }),
        });

        if (pValues.length > 0) {
          pValues.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          changePoints.push(...pValues);
          responseUpdate.changePoints = getChangePointsSortedByScore([...changePoints]);
        }

        loaded += (1 / fieldCandidatesChunks.length) * PROGRESS_STEP_P_VALUES;
        setResponse({
          ...responseUpdate,
          loaded,
          loadingState: `Identified ${
            responseUpdate.changePoints?.length ?? 0
          } significant field/value pairs.`,
        });

        if (abortCtrl.current.signal.aborted) {
          return;
        }
      }

      setResponse({
        loadingState: `Loading fields stats.`,
      });
      setResponse.flush();

      const { stats } = await http.post<{ stats: FieldStats[] }>(
        '/internal/apm/correlations/field_stats',
        {
          signal: abortCtrl.current.signal,
          body: JSON.stringify({ ...fetchParams, fieldsToSample: [...fieldsToSample] }),
        }
      );

      // overall time series
      const body = JSON.stringify({
        query: discoverQuery,
        fields: [{ fieldName: '@timestamp', type: 'date' }],
        samplerShardSize: -1,
      });

      responseUpdate.fieldStats = stats;

      loaded += 0.05;
      setResponse({
        loaded,
        loadingState: `Loading overall timeseries.`,
      });
      setResponse.flush();

      const overallTimeSeries = await http.post<HistogramResponse>({
        path: `/api/ml/data_visualizer/get_field_histograms/${dataViewTitle}`,
        body,
      });

      responseUpdate.overallTimeSeries = overallTimeSeries[0].data;

      loaded += 0.05;
      setResponse({
        loaded,
        loadingState: `Loading significant timeseries.`,
      });
      setResponse.flush();

      // time series filtered by fields
      if (responseUpdate.changePoints) {
        await asyncForEach(responseUpdate.changePoints, async (cp, index) => {
          if (responseUpdate.changePoints) {
            const histogramQuery = {
              bool: {
                filter: [
                  ...discoverQuery.bool.filter,
                  {
                    term: { [cp.fieldName]: cp.fieldValue },
                  },
                ],
              },
            };

            const hBody = JSON.stringify({
              query: histogramQuery,
              fields: [
                {
                  fieldName: '@timestamp',
                  type: 'date',
                  interval: overallTimeSeries[0].interval,
                  min: overallTimeSeries[0].stats[0],
                  max: overallTimeSeries[0].stats[1],
                },
              ],
              samplerShardSize: -1,
            });

            const cpTimeSeries = await http.post<HistogramResponse>({
              path: `/api/ml/data_visualizer/get_field_histograms/${dataViewTitle}`,
              body: hBody,
            });

            responseUpdate.changePoints[index].histogram = cpTimeSeries[0].data;
          }
        });
        loaded += (1 / responseUpdate.changePoints.length) * PROGRESS_STEP_HISTOGRAMS;
        setResponse({
          ...responseUpdate,
          loaded,
          isRunning: true,
        });
      }

      const frequentItemsFieldCandidates = responseUpdate.changePoints
        ?.map(({ fieldName, fieldValue }) => ({ fieldName, fieldValue }))
        .filter(
          (d) =>
            d.fieldName !== 'clientip' &&
            d.fieldName !== 'ip' &&
            d.fieldName !== 'extension.keyword'
        );

      if (frequentItemsFieldCandidates === undefined) {
        setResponse({
          ...responseUpdate,
          loaded: LOADED_DONE,
          isRunning: false,
          loadingState: `Done.`,
        });
        setResponse.flush();
        return;
      }

      loaded += PROGRESS_STEP_FREQUENT_ITEMS;
      setResponse({
        loaded,
        loadingState: `Loading frequent item sets.`,
      });
      setResponse.flush();

      const { frequentItems, totalDocCount } = await http.post<{
        frequentItems: FrequentItems;
        totalDocCount: number;
      }>('/internal/apm/correlations/change_point_frequent_items', {
        signal: abortCtrl.current.signal,
        body: JSON.stringify({
          ...fetchParams,
          timestampField,
          fieldCandidates: frequentItemsFieldCandidates,
          ...searchStrategyParams,
        }),
      });

      setResponse({
        loadingState: `Generating tree structure`,
      });
      setResponse.flush();

      const tree = generateItemsets(
        frequentItems,
        responseUpdate.changePoints ?? [],
        totalDocCount
      );

      responseUpdate.tree = tree;

      setResponse({
        ...responseUpdate,
        loaded: LOADED_DONE,
        isRunning: false,
        loadingState: `Done.`,
      });
      setResponse.flush();
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
  }, [
    dataViewTitle,
    discoverQuery,
    http,
    fetchParams,
    setResponse,
    searchStrategyParams,
    timestampField,
  ]);

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
