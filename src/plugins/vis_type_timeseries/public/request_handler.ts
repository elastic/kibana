/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaContext } from '../../data/public';

import { getTimezone } from './application/lib/get_timezone';
import { validateInterval } from './application/lib/validate_interval';
import { getUISettings, getDataStart, getCoreStart } from './services';
import { MAX_BUCKETS_SETTING, ROUTES } from '../common/constants';
import { TimeseriesVisParams } from './types';
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
  const data = getDataStart();

  const timezone = getTimezone(config);
  const uiStateObj = uiState[visParams.type] ?? {};
  const dataSearch = data.search;
  const parsedTimeRange = data.query.timefilter.timefilter.calculateBounds(input?.timeRange!);

  if (visParams && visParams.id && !visParams.isModelInvalid) {
    const maxBuckets = config.get<number>(MAX_BUCKETS_SETTING);

    validateInterval(parsedTimeRange, visParams, maxBuckets);

    const untrackSearch =
      dataSearch.session.isCurrentSession(searchSessionId) &&
      dataSearch.session.trackSearch({
        abort: () => {
          // TODO: support search cancellations
        },
      });

    try {
      const searchSessionOptions = dataSearch.session.getSearchOptions(searchSessionId);
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
          ...(searchSessionOptions && {
            searchSession: searchSessionOptions,
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
