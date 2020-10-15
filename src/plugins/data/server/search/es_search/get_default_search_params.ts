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

import { SharedGlobalConfig, IUiSettingsClient } from '../../../../../core/server';
import { UI_SETTINGS } from '../../../common/constants';

export function getShardTimeout(config: SharedGlobalConfig) {
  const timeout = config.elasticsearch.shardTimeout.asMilliseconds();
  return timeout
    ? {
        timeout: `${timeout}ms`,
      }
    : {};
}

export async function getDefaultSearchParams(uiSettingsClient: IUiSettingsClient) {
  const ignoreThrottled = !(await uiSettingsClient.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN));
  const maxConcurrentShardRequests = await uiSettingsClient.get<number>(
    UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
  );
  return {
    maxConcurrentShardRequests:
      maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined,
    ignoreThrottled,
    ignoreUnavailable: true, // Don't fail if the index/indices don't exist
    trackTotalHits: true,
  };
}

/**
 @internal
 */
export const getAsyncOptions = () => ({
  waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
  keepAlive: '1m', // Extend the TTL for this search request by one minute
});
