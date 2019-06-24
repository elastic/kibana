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
// @ts-ignore
import { uiModules } from 'ui/modules';
import { getCanTrackUiMetrics } from 'ui/ui_metric';
import { API_BASE_PATH } from '../common';

let _http: any;

uiModules.get('kibana').run(($http: any) => {
  _http = $http;
});

function createErrorMessage(subject: string): any {
  const message =
    `trackUiMetric was called with ${subject}, which is not allowed to contain a colon. ` +
    `Colons play a special role in how metrics are saved as stored objects`;
  return new Error(message);
}

export function trackUiMetric(appName: string, metricType: string | string[]) {
  if (!getCanTrackUiMetrics()) {
    return;
  }

  if (appName.includes(':')) {
    throw createErrorMessage(`app name '${appName}'`);
  }

  if (metricType.includes(':')) {
    throw createErrorMessage(`metric type ${metricType}`);
  }

  const metricTypes = Array.isArray(metricType) ? metricType.join(',') : metricType;
  const uri = chrome.addBasePath(`${API_BASE_PATH}/${appName}/${metricTypes}`);
  _http.post(uri);
}
