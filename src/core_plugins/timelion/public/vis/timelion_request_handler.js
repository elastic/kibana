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

import _ from 'lodash';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';

import { timezoneProvider } from 'ui/vis/lib/timezone';
const TimelionRequestHandlerProvider = function (Private, Notifier, $http) {
  const timezone = Private(timezoneProvider)();
  const dashboardContext = Private(dashboardContextProvider);

  const notify = new Notifier({
    location: 'Timelion'
  });

  return {
    name: 'timelion',
    handler: function (vis, { timeRange }) {

      return new Promise((resolve, reject) => {
        const expression = vis.params.expression;
        if (!expression) return;

        const httpResult = $http.post('../api/timelion/run', {
          sheet: [expression],
          extended: {
            es: {
              filter: dashboardContext()
            }
          },
          time: _.extend(timeRange, {
            interval: vis.params.interval,
            timezone: timezone
          }),
        })
          .then(resp => resp.data)
          .catch(resp => { throw resp.data; });

        httpResult
          .then(function (resp) {
            resolve(resp);
          })
          .catch(function (resp) {
            const err = new Error(resp.message);
            err.stack = resp.stack;
            notify.error(err);
            reject(err);
          });
      });
    }
  };
};

export { TimelionRequestHandlerProvider };
