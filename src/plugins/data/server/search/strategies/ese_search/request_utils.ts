/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/server';
import { AsyncSearchGetRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AsyncSearchSubmitRequest } from '@elastic/elasticsearch/lib/api/types';
import { ISearchOptions, UI_SETTINGS } from '../../../../common';
import { getDefaultSearchParams } from '../es_search';
import { SearchSessionsConfigSchema } from '../../../../config';

/**
 * @internal
 */
export async function getIgnoreThrottled(
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>
): Promise<{ ignore_throttled?: boolean }> {
  const includeFrozen = await uiSettingsClient.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
  return includeFrozen ? { ignore_throttled: false } : {};
}

/**
 @internal
 */
export async function getDefaultAsyncSubmitParams(
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>,
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Promise<
  Pick<
    AsyncSearchSubmitRequest,
    | 'batched_reduce_size'
    | 'keep_alive'
    | 'wait_for_completion_timeout'
    | 'ignore_throttled'
    | 'max_concurrent_shard_requests'
    | 'ignore_unavailable'
    | 'track_total_hits'
    | 'keep_on_completion'
  >
> {
  const useSearchSessions = searchSessionsConfig?.enabled && !!options.sessionId;

  // TODO: searchSessionsConfig could be "null" if we are running without x-pack which happens only in tests.
  // This can be cleaned up when we completely stop separating basic and oss
  const keepAlive = useSearchSessions
    ? `${searchSessionsConfig!.defaultExpiration.asMilliseconds()}ms`
    : '1m';

  return {
    // TODO: adjust for partial results
    batched_reduce_size: 64,
    // Wait up to 100ms for the response to return
    wait_for_completion_timeout: '100ms',
    // If search sessions are used, store and get an async ID even for short running requests.
    keep_on_completion: useSearchSessions,
    // The initial keepalive is as defined in defaultExpiration if search sessions are used or 1m otherwise.
    keep_alive: keepAlive,
    ...(await getIgnoreThrottled(uiSettingsClient)),
    ...(await getDefaultSearchParams(uiSettingsClient)),
    // If search sessions are used, set the initial expiration time.
  };
}

/**
 @internal
 */
export function getDefaultAsyncGetParams(
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Pick<AsyncSearchGetRequest, 'keep_alive' | 'wait_for_completion_timeout'> {
  const useSearchSessions = searchSessionsConfig?.enabled && !!options.sessionId;

  return {
    // Wait up to 100ms for the response to return
    wait_for_completion_timeout: '100ms',
    ...(useSearchSessions
      ? // Don't change the expiration of search requests that are tracked in a search session
        undefined
      : {
          // We still need to do polling for searches not within the context of a search session or when search session disabled
          keep_alive: '1m',
        }),
  };
}
