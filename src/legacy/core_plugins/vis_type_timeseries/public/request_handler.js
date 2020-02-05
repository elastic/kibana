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

import { validateInterval } from './lib/validate_interval';
import { timezoneProvider } from './legacy_imports';
import { getUISettings, getDataStart, getCoreStart } from './services';

export const metricsRequestHandler = async ({
  uiState,
  timeRange,
  filters,
  query,
  visParams,
  savedObjectId,
}) => {
  const config = getUISettings();
  const timezone = timezoneProvider(config)();
  const uiStateObj = uiState.get(visParams.type, {});
  const parsedTimeRange = getDataStart().query.timefilter.timefilter.calculateBounds(timeRange);
  const scaledDataFormat = config.get('dateFormat:scaled');
  const dateFormat = config.get('dateFormat');

  if (visParams && visParams.id && !visParams.isModelInvalid) {
    try {
      const maxBuckets = config.get('metrics:max_buckets');

      validateInterval(parsedTimeRange, visParams, maxBuckets);

      const resp = await getCoreStart().http.post('/api/metrics/vis/data', {
        body: JSON.stringify({
          timerange: {
            timezone,
            ...parsedTimeRange,
          },
          query,
          filters,
          panels: [visParams],
          state: uiStateObj,
          savedObjectId: savedObjectId || 'unsaved',
        }),
      });

      return {
        dateFormat,
        scaledDataFormat,
        timezone,
        ...resp,
      };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  return Promise.resolve({});
};
