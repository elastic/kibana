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

import { TIMEOUT } from './constants';

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent to GET /_cluster/stats?timeout=30s.
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise} The response from Elasticsearch equivalent to GET /_cluster/stats.
 */
export function getClusterStats(callCluster) {
  return callCluster('cluster.stats', {
    timeout: TIMEOUT
  });
}
