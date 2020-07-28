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

import { getTimezone, validateInterval } from './application';
import { getUISettings, getDataStart, getCoreStart } from './services';
import { MAX_BUCKETS_SETTING } from '../common/constants';

export const metricsRequestHandler = async ({
  uiState,
  timeRange,
  filters,
  query,
  visParams,
  savedObjectId,
}) => {
  const config = getUISettings();
  const timezone = getTimezone(config);
  const uiStateObj = uiState.get(visParams.type, {});
  const parsedTimeRange = getDataStart().query.timefilter.timefilter.calculateBounds(timeRange);
  const scaledDataFormat = config.get('dateFormat:scaled');
  const dateFormat = config.get('dateFormat');

  if (visParams && visParams.id && !visParams.isModelInvalid) {
    try {
      const maxBuckets = config.get(MAX_BUCKETS_SETTING);

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
