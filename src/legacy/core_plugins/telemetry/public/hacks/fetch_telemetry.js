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

import uiChrome from 'ui/chrome';
import moment from 'moment';

/**
 * Fetch Telemetry data by calling the Kibana API.
 *
 * @param {Object} $http The HTTP handler
 * @param {String} basePath The base URI
 * @param {Function} _moment moment.js, but injectable for tests
 * @return {Promise} An array of cluster Telemetry objects.
 */
export function fetchTelemetry(
  $http,
  { basePath = uiChrome.getBasePath(), _moment = moment, unencrypted = false } = {}
) {
  return $http.post(`${basePath}/api/telemetry/v2/clusters/_stats`, {
    unencrypted,
    timeRange: {
      min: _moment()
        .subtract(20, 'minutes')
        .toISOString(),
      max: _moment().toISOString(),
    },
  });
}
