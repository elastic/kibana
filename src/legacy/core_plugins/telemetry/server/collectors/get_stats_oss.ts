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

import { getLocalStats } from '.';

/**
 * Get the telemetry data.
 *
 * @param {Object} req The incoming request.
 * @param {Object} config Kibana config.
 * @param {String} start The start time of the request (likely 20m ago).
 * @param {String} end The end time of the request.
 * @param {Boolean} unencrypted Is the request payload going to be unencrypted.
 * @return {Promise} An array of telemetry objects.
 */
export async function getStatsOSS(
  req: any,
  config: any,
  start: string,
  end: string,
  unencrypted: boolean,
  _getLocalStats = getLocalStats
) {
  const useInternalUser = !unencrypted;

  // return it as an array for a consistent API response
  return [await _getLocalStats(req, { useInternalUser })];
}
