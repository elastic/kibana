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

import type { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import type { Search } from '@elastic/elasticsearch/api/requestParams';
import type { IUiSettingsClient, SharedGlobalConfig } from 'kibana/server';
import { UI_SETTINGS } from '../../../common';

export function getShardTimeout(config: SharedGlobalConfig): Pick<Search, 'timeout'> {
  const timeout = config.elasticsearch.shardTimeout.asMilliseconds();
  return timeout ? { timeout: `${timeout}ms` } : {};
}

export async function getDefaultSearchParams(
  uiSettingsClient: IUiSettingsClient
): Promise<
  Pick<Search, 'max_concurrent_shard_requests' | 'ignore_unavailable' | 'track_total_hits'>
> {
  const maxConcurrentShardRequests = await uiSettingsClient.get<number>(
    UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
  );
  return {
    max_concurrent_shard_requests:
      maxConcurrentShardRequests > 0 ? maxConcurrentShardRequests : undefined,
    ignore_unavailable: true, // Don't fail if the index/indices don't exist
    track_total_hits: true,
  };
}

/**
 * Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297 is resolved.
 * Shims the `AbortSignal` behavior so that, if the given `signal` aborts, the `abort` method on the
 * `TransportRequestPromise` is called, actually performing the cancellation.
 * @internal
 */
export const shimAbortSignal = <T>(promise: TransportRequestPromise<T>, signal?: AbortSignal) => {
  if (!signal) return promise;
  const abortHandler = () => {
    promise.abort();
    cleanup();
  };
  const cleanup = () => signal.removeEventListener('abort', abortHandler);
  if (signal.aborted) {
    promise.abort();
  } else {
    signal.addEventListener('abort', abortHandler);
    promise.then(cleanup, cleanup);
  }
  return promise;
};
