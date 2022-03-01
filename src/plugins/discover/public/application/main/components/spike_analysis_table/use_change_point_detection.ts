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

export interface ChangePointsResponse {
  ccsWarning: boolean;
  changePoints?: ChangePoint[];
  fieldStats?: FieldStats[];
  overallTimeSeries?: HistogramItem[];
}

type HistogramResponse = Array<{ data: HistogramItem[] }>;

export const DEBOUNCE_INTERVAL = 100;

// Overall progress is a float from 0 to 1.
const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_FIELD_CANDIDATES = LOADED_OVERALL_HISTOGRAM + 0.05;
const LOADED_DONE = 1;
const PROGRESS_STEP_P_VALUES = 0.9;

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
      changePoints: undefined,
      fieldStats: undefined,
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

      setResponse({
        ...responseUpdate,
        loaded: LOADED_OVERALL_HISTOGRAM,
      });
      setResponse.flush();

      const { fieldCandidates } = await http.get<{ fieldCandidates: string[] }>(
        '/internal/apm/correlations/field_candidates',
        {
          signal: abortCtrl.current.signal,
          query: fetchParams,
        }
      );

      // const { fieldCandidates } = await callApmApi(
      //   'GET /internal/apm/correlations/field_candidates',
      //   {
      //     signal: abortCtrl.current.signal,
      //     params: {
      //       query: fetchParams,
      //     },
      //   }
      // );
      // console.log('fieldCandidates', fieldCandidates);

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      setResponse({
        loaded: LOADED_FIELD_CANDIDATES,
      });
      setResponse.flush();

      const changePoints: ChangePoint[] = [];
      const fieldsToSample = new Set<string>();
      const chunkSize = 10;
      let chunkLoadCounter = 0;

      const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidatesChunk of fieldCandidatesChunks) {
        const { changePoints: pValues } = await http.post<{
          changePoints: ChangePoint[];
        }>('/internal/apm/correlations/change_point_p_values', {
          signal: abortCtrl.current.signal,
          body: JSON.stringify({
            ...fetchParams,
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

        chunkLoadCounter++;
        setResponse({
          ...responseUpdate,
          loaded:
            LOADED_FIELD_CANDIDATES +
            (chunkLoadCounter / fieldCandidatesChunks.length) * PROGRESS_STEP_P_VALUES,
        });

        if (abortCtrl.current.signal.aborted) {
          return;
        }
      }

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

      const overallTimeSeries = await http.post<HistogramResponse>({
        path: `/api/ml/data_visualizer/get_field_histograms/${dataViewTitle}`,
        body,
      });

      responseUpdate.overallTimeSeries = overallTimeSeries[0].data;

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
              fields: [{ fieldName: '@timestamp', type: 'date' }],
              samplerShardSize: -1,
            });

            const cpTimeSeries = await http.post<HistogramResponse>({
              path: `/api/ml/data_visualizer/get_field_histograms/${dataViewTitle}`,
              body: hBody,
            });

            responseUpdate.changePoints[index].histogram = cpTimeSeries[0].data;
            setResponse({
              ...responseUpdate,
              loaded: 0.99,
              isRunning: true,
            });
          }
        });
      }

      setResponse({
        ...responseUpdate,
        loaded: LOADED_DONE,
        isRunning: false,
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
  }, [dataViewTitle, discoverQuery, http, fetchParams, setResponse, searchStrategyParams]);

  const cancelFetch = useCallback(() => {
    abortCtrl.current.abort();
    setResponse({
      isRunning: false,
    });
    setResponse.flush();
  }, [setResponse]);

  const { error, loaded, isRunning, ...returnedResponse } = response;
  const progress = useMemo(
    () => ({
      error,
      loaded: Math.round(loaded * 100) / 100,
      isRunning,
    }),
    [error, loaded, isRunning]
  );

  return {
    progress,
    response: returnedResponse,
    startFetch,
    cancelFetch,
  };
}
