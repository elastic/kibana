/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
