/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KibanaContext } from '../../data/public';

import { getTimezone, validateInterval } from './application';
import { getUISettings, getDataStart, getCoreStart } from './services';
import { MAX_BUCKETS_SETTING, ROUTES } from '../common/constants';
import { TimeseriesVisParams } from './metrics_fn';
import { TimeseriesVisData } from '../common/types';

interface MetricsRequestHandlerParams {
  input: KibanaContext | null;
  uiState: Record<string, any>;
  visParams: TimeseriesVisParams;
  searchSessionId?: string;
}

export const metricsRequestHandler = async ({
  input,
  uiState,
  visParams,
  searchSessionId,
}: MetricsRequestHandlerParams): Promise<TimeseriesVisData | {}> => {
  const config = getUISettings();
  const timezone = getTimezone(config);
  const uiStateObj = uiState[visParams.type] ?? {};
  const data = getDataStart();
  const dataSearch = getDataStart().search;
  const parsedTimeRange = data.query.timefilter.timefilter.calculateBounds(input?.timeRange!);

  if (visParams && visParams.id && !visParams.isModelInvalid) {
    const maxBuckets = config.get(MAX_BUCKETS_SETTING);

    validateInterval(parsedTimeRange, visParams, maxBuckets);

    const untrackSearch =
      dataSearch.session.isCurrentSession(searchSessionId) &&
      dataSearch.session.trackSearch({
        abort: () => {
          // TODO: support search cancellations
        },
      });

    try {
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
          ...(searchSessionId && {
            searchSession: dataSearch.session.getSearchOptions(searchSessionId),
          }),
        }),
      });
    } finally {
      if (untrackSearch && dataSearch.session.isCurrentSession(searchSessionId)) {
        // untrack if this search still belongs to current session
        untrackSearch();
      }
    }
  }

  return {};
};
