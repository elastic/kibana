/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from 'src/core/public';
import type { Adapters } from 'src/plugins/inspector';
import { getTimezone } from './application/lib/get_timezone';
import { getUISettings, getDataStart, getCoreStart } from './services';
import { ROUTES, UI_SETTINGS } from '../common/constants';
import { KibanaContext, handleResponse } from '../../../data/public';

import type { TimeseriesVisParams } from './types';
import type { TimeseriesVisData } from '../common/types';

interface MetricsRequestHandlerParams {
  input: KibanaContext | null;
  uiState: Record<string, any>;
  visParams: TimeseriesVisParams;
  searchSessionId?: string;
  executionContext?: KibanaExecutionContext;
  inspectorAdapters?: Adapters;
}

export const metricsRequestHandler = async ({
  input,
  uiState,
  visParams,
  searchSessionId,
  executionContext,
  inspectorAdapters,
}: MetricsRequestHandlerParams): Promise<TimeseriesVisData | {}> => {
  const config = getUISettings();
  const data = getDataStart();
  const theme = getCoreStart().theme;

  const timezone = getTimezone(config);
  const uiStateObj = uiState[visParams.type] ?? {};
  const dataSearch = data.search;
  const parsedTimeRange = data.query.timefilter.timefilter.calculateBounds(input?.timeRange!);

  if (visParams && visParams.id && !visParams.isModelInvalid) {
    const untrackSearch =
      dataSearch.session.isCurrentSession(searchSessionId) &&
      dataSearch.session.trackSearch({
        abort: () => {
          // TODO: support search cancellations
        },
      });

    try {
      const searchSessionOptions = dataSearch.session.getSearchOptions(searchSessionId);

      const visData: TimeseriesVisData = await getCoreStart().http.post(ROUTES.VIS_DATA, {
        body: JSON.stringify({
          timerange: {
            timezone,
            ...parsedTimeRange,
          },
          query: input?.query,
          filters: input?.filters,
          panels: [visParams],
          state: uiStateObj,
          ...(searchSessionOptions && {
            searchSession: searchSessionOptions,
          }),
        }),
        context: executionContext,
      });

      inspectorAdapters?.requests?.reset();

      Object.entries(visData.trackedEsSearches || {}).forEach(([key, query]) => {
        inspectorAdapters?.requests
          ?.start(query.label ?? key, { searchSessionId })
          .json(query.body)
          .ok({ time: query.time });

        if (query.response && config.get(UI_SETTINGS.ALLOW_CHECKING_FOR_FAILED_SHARDS)) {
          handleResponse({ body: query.body }, { rawResponse: query.response }, theme);
        }
      });

      return visData;
    } finally {
      if (untrackSearch && dataSearch.session.isCurrentSession(searchSessionId)) {
        // untrack if this search still belongs to current session
        untrackSearch();
      }
    }
  }

  return {};
};
