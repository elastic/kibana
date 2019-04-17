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

import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import { getCanGatherUiMetrics } from 'ui/ui_metric';
import { API_BASE_PATH } from '../common';

const module = uiModules.get('kibana');

let _http;

module.run($http => {
  _http = $http;
});

module.config(($httpProvider) => {
  $httpProvider.interceptors.push(($q) => {
    return {
      request: config => {
        const { url } = config;
        const isUiMetricRequest = url.indexOf(`${chrome.getBasePath()}${API_BASE_PATH}`) === 0;
        const canGatherUiMetrics = getCanGatherUiMetrics();

        if (isUiMetricRequest && !canGatherUiMetrics) {
          // Block request from going out if the user has disabled telemetry.
          return $q.reject('uiMetricsDisallowed');
        } else {
          return $q.resolve(config);
        }
      },
    };
  });
});

export function track(appName: string, actionType: string) {
  const uri = chrome.addBasePath(`${API_BASE_PATH}/${appName}/${actionType}`);
  // Silently swallow request failures.
  _http.post(uri).then(() => {}, () => {});
}
