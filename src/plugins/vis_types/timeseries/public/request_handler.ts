/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { KibanaContext } from '@kbn/data-plugin/public';
import { getTimezone } from './application/lib/get_timezone';
import { getUISettings, getDataStart, getCoreStart } from './services';
import { ROUTES } from '../common/constants';

import type { TimeseriesVisParams } from './types';
import type { TimeseriesVisData } from '../common/types';

interface MetricsRequestHandlerParams {
  input: KibanaContext | null;
  uiState: Record<string, any>;
  visParams: TimeseriesVisParams;
  searchSessionId?: string;
  executionContext?: KibanaExecutionContext;
  inspectorAdapters?: Adapters;
  expressionAbortSignal: AbortSignal;
}

export const metricsRequestHandler = async ({
  input,
  uiState,
  visParams,
  searchSessionId,
  executionContext,
  inspectorAdapters,
  expressionAbortSignal,
}: MetricsRequestHandlerParams): Promise<TimeseriesVisData | {}> => {
  if (!expressionAbortSignal.aborted) {
    const config = getUISettings();
    const data = getDataStart();
    const abortController = new AbortController();
    const expressionAbortHandler = function () {
      abortController.abort();
    };

    expressionAbortSignal.addEventListener('abort', expressionAbortHandler);

    const timezone = getTimezone(config);
    const uiStateObj = uiState[visParams.type] ?? {};
    const dataSearch = data.search;
    const parsedTimeRange = data.query.timefilter.timefilter.calculateBounds(input?.timeRange!);

    const doSearch = async (
      searchOptions: ReturnType<typeof dataSearch.session.getSearchOptions>
    ): Promise<TimeseriesVisData> => {
      return await getCoreStart().http.post(ROUTES.VIS_DATA, {
        body: JSON.stringify({
          timerange: {
            timezone,
            ...parsedTimeRange,
          },
          query: input?.query,
          filters: input?.filters,
          panels: [visParams],
          state: uiStateObj,
          ...(searchOptions
            ? {
                searchSession: searchOptions,
              }
            : {}),
        }),
        context: executionContext,
        signal: abortController.signal,
      });
    };

    if (visParams && visParams.id && !visParams.isModelInvalid && !expressionAbortSignal.aborted) {
      const searchTracker = dataSearch.session.isCurrentSession(searchSessionId)
        ? dataSearch.session.trackSearch({
            abort: () => abortController.abort(),
            poll: async () => {
              // don't use, keep this empty, onSavingSession is used instead
            },
            onSavingSession: async (searchSessionOptions) => {
              await doSearch(searchSessionOptions);
            },
          })
        : undefined;

      try {
        const searchSessionOptions = dataSearch.session.getSearchOptions(searchSessionId);
        const visData: TimeseriesVisData = await doSearch(searchSessionOptions);

        inspectorAdapters?.requests?.reset();

        Object.entries(visData.trackedEsSearches || {}).forEach(([key, query]) => {
          inspectorAdapters?.requests
            ?.start(query.label ?? key, { searchSessionId })
            .json(query.body)
            .ok({ time: query.time, json: { rawResponse: query.response } });
        });

        searchTracker?.complete();

        return visData;
      } catch (e) {
        searchTracker?.error();
        throw e;
      } finally {
        expressionAbortSignal.removeEventListener('abort', expressionAbortHandler);
      }
    }
  }

  return {};
};
