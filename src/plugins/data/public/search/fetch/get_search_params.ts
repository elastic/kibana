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

import { IUiSettingsClient } from 'kibana/public';
import {
  COURIER_SET_REQUEST_PREFERENCE_SETTINGS,
  COURIER_CUSTOM_REQUEST_PREFERENCE_SETTINGS,
  COURIER_MAX_CONCURRENT_SHARD_REQUESTS_SETTINGS,
  SEARCH_INCLUDE_FROZEN_SETTINGS,
} from '../../../common';

const sessionId = Date.now();

export function getSearchParams(config: IUiSettingsClient, esShardTimeout: number = 0) {
  return {
    rest_total_hits_as_int: true,
    ignore_unavailable: true,
    ignore_throttled: getIgnoreThrottled(config),
    max_concurrent_shard_requests: getMaxConcurrentShardRequests(config),
    preference: getPreference(config),
    timeout: getTimeout(esShardTimeout),
  };
}

export function getIgnoreThrottled(config: IUiSettingsClient) {
  return !config.get(SEARCH_INCLUDE_FROZEN_SETTINGS);
}

export function getMaxConcurrentShardRequests(config: IUiSettingsClient) {
  const maxConcurrentShardRequests = config.get(COURIER_MAX_CONCURRENT_SHARD_REQUESTS_SETTINGS);
  return maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined;
}

export function getPreference(config: IUiSettingsClient) {
  const setRequestPreference = config.get(COURIER_SET_REQUEST_PREFERENCE_SETTINGS);
  if (setRequestPreference === 'sessionId') return sessionId;
  return setRequestPreference === 'custom'
    ? config.get(COURIER_CUSTOM_REQUEST_PREFERENCE_SETTINGS)
    : undefined;
}

export function getTimeout(esShardTimeout: number) {
  return esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined;
}
