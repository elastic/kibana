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

export function getMSearchParams(config) {
  return {
    rest_total_hits_as_int: true,
    ignore_throttled: getIgnoreThrottled(config),
    max_concurrent_shard_requests: getMaxConcurrentShardRequests(config),
  };
}

export function getSearchParams(config, sessionId, esShardTimeout) {
  return {
    rest_total_hits_as_int: true,
    ignore_unavailable: true,
    ignore_throttled: getIgnoreThrottled(config),
    max_concurrent_shard_requests: getMaxConcurrentShardRequests(config),
    preference: getPreference(config, sessionId),
    timeout: getTimeout(esShardTimeout),
  };
}

export function getIgnoreThrottled(config) {
  return !config.get('search:includeFrozen');
}

export function getMaxConcurrentShardRequests(config) {
  const maxConcurrentShardRequests = config.get('courier:maxConcurrentShardRequests');
  return maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined;
}

export function getPreference(config, sessionId) {
  const setRequestPreference = config.get('courier:setRequestPreference');
  if (setRequestPreference === 'sessionId') return sessionId;
  return setRequestPreference === 'custom'
    ? config.get('courier:customRequestPreference')
    : undefined;
}

export function getTimeout(esShardTimeout) {
  return esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined;
}
