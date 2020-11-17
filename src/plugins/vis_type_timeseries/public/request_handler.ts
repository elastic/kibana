/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { KibanaContext } from '../../data/public';

import { getTimezone, validateInterval } from './application';
import { getUISettings, getDataStart, getCoreStart } from './services';
import { MAX_BUCKETS_SETTING, ROUTES } from '../common/constants';
import { PanelSchema } from '../common/types';

interface MetricsRequestHandlerParams {
  input: KibanaContext | null;
  uiState: Record<string, any>;
  visParams: PanelSchema;
}

export const metricsRequestHandler = async ({
  input,
  uiState,
  visParams,
}: MetricsRequestHandlerParams) => {
  const config = getUISettings();
  const timezone = getTimezone(config);
  const uiStateObj = uiState[visParams.type] ?? {};
  const dataSearch = getDataStart();
  const parsedTimeRange = dataSearch.query.timefilter.timefilter.calculateBounds(input?.timeRange!);
  const scaledDataFormat = config.get('dateFormat:scaled');
  const dateFormat = config.get('dateFormat');

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

    return {
      dateFormat,
      scaledDataFormat,
      timezone,
      ...resp,
    };
  }

  return {};
};
