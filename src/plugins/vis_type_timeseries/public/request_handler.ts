/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
}

export const metricsRequestHandler = async ({
  input,
  uiState,
  visParams,
}: MetricsRequestHandlerParams): Promise<TimeseriesVisData | {}> => {
  const config = getUISettings();
  const timezone = getTimezone(config);
  const uiStateObj = uiState[visParams.type] ?? {};
  const dataSearch = getDataStart();
  const parsedTimeRange = dataSearch.query.timefilter.timefilter.calculateBounds(input?.timeRange!);

  if (visParams && visParams.id && !visParams.isModelInvalid) {
    const maxBuckets = config.get(MAX_BUCKETS_SETTING);

    validateInterval(parsedTimeRange, visParams, maxBuckets);

    const resp = await getCoreStart().http.post(ROUTES.VIS_DATA, {
      body: JSON.stringify({
        timerange: {
          timezone,
          ...parsedTimeRange,
        },
        query: input?.query,
        filters: input?.filters,
        panels: [visParams],
        state: uiStateObj,
        sessionId: dataSearch.search.session.getSessionId(),
      }),
    });

    return resp;
  }

  return {};
};
