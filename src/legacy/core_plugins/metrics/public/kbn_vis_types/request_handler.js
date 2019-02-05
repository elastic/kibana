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

import { validateInterval } from '../lib/validate_interval';
import { timezoneProvider } from 'ui/vis/lib/timezone';
import { timefilter } from 'ui/timefilter';

const MetricsRequestHandlerProvider = function (Private, Notifier, config, $http, i18n) {
  const notify = new Notifier({ location: i18n('tsvb.requestHandler.notifier.locationNameTitle', { defaultMessage: 'Metrics' }) });

  return {
    name: 'metrics',
    handler: function ({ uiState, timeRange, filters, query, visParams }) {
      const timezone = Private(timezoneProvider)();
      return new Promise((resolve) => {
        const panel = visParams;
        const uiStateObj = uiState.get(panel.type, {});
        const parsedTimeRange = timefilter.calculateBounds(timeRange);
        const scaledDataFormat = config.get('dateFormat:scaled');
        const dateFormat = config.get('dateFormat');
        if (panel && panel.id) {
          const params = {
            timerange: { timezone, ...parsedTimeRange },
            query: Array.isArray(query) ? query : [query],
            filters,
            panels: [panel],
            state: uiStateObj
          };

          try {
            const maxBuckets = config.get('metrics:max_buckets');
            validateInterval(parsedTimeRange, panel, maxBuckets);
            const httpResult = $http.post('../api/metrics/vis/data', params)
              .then(resp => ({ dateFormat, scaledDataFormat, timezone, ...resp.data }))
              .catch(resp => { throw resp.data; });

            return httpResult
              .then(resolve)
              .catch(resp => {
                resolve({});
                const err = new Error(resp.message);
                err.stack = resp.stack;
                notify.error(err);
              });
          } catch (e) {
            notify.error(e);
            return resolve();
          }
        }
      });
    }
  };
};

export { MetricsRequestHandlerProvider };
