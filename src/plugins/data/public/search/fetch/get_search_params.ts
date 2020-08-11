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

import { IUiSettingsClient, CoreStart } from 'kibana/public';
import { UI_SETTINGS, ISearchRequestParams } from '../../../common';
import { SearchRequest } from './types';

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
  return !config.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
}

export function getMaxConcurrentShardRequests(config: IUiSettingsClient) {
  const maxConcurrentShardRequests = config.get(UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS);
  return maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined;
}

export function getPreference(config: IUiSettingsClient) {
  const setRequestPreference = config.get(UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE);
  if (setRequestPreference === 'sessionId') return sessionId;
  return setRequestPreference === 'custom'
    ? config.get(UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE)
    : undefined;
}

export function getTimeout(esShardTimeout: number) {
  return esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined;
}

export function getSearchParamsFromRequest(
  searchRequest: SearchRequest,
  dependencies: { injectedMetadata: CoreStart['injectedMetadata']; uiSettings: IUiSettingsClient }
): ISearchRequestParams {
  const { injectedMetadata, uiSettings } = dependencies;
  const esShardTimeout = injectedMetadata.getInjectedVar('esShardTimeout') as number;
  const searchParams = getSearchParams(uiSettings, esShardTimeout);

  return {
    index: searchRequest.index.title || searchRequest.index,
    body: searchRequest.body,
    ...searchParams,
  };
}
