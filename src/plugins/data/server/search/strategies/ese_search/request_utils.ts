/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/server';
import {
  AsyncSearchGet,
  AsyncSearchSubmit,
  Search,
} from '@elastic/elasticsearch/api/requestParams';
import { ISearchOptions, UI_SETTINGS } from '../../../../common';
import { getDefaultSearchParams } from '../es_search';
import { SearchSessionsConfigSchema } from '../../../../config';

/**
 * @internal
 */
export async function getIgnoreThrottled(
  uiSettingsClient: IUiSettingsClient
): Promise<Pick<Search, 'ignore_throttled'>> {
  const includeFrozen = await uiSettingsClient.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
  return { ignore_throttled: !includeFrozen };
}

/**
 @internal
 */
export async function getDefaultAsyncSubmitParams(
  uiSettingsClient: IUiSettingsClient,
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Promise<
  Pick<
    AsyncSearchSubmit,
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
  return {
    batched_reduce_size: 64,
    keep_on_completion: !!options.sessionId, // Always return an ID, even if the request completes quickly
    ...getDefaultAsyncGetParams(options),
    ...(await getIgnoreThrottled(uiSettingsClient)),
    ...(await getDefaultSearchParams(uiSettingsClient)),
    ...(options.sessionId
      ? {
          // TODO: searchSessionsConfig could be "null" if we are running without x-pack which happens only in tests.
          // This can be cleaned up when we completely stop separating basic and oss
          keep_alive: searchSessionsConfig
            ? `${searchSessionsConfig.defaultExpiration.asMilliseconds()}ms`
            : '1m',
        }
      : {}),
  };
}

/**
 @internal
 */
export function getDefaultAsyncGetParams(
  options: ISearchOptions
): Pick<AsyncSearchGet, 'keep_alive' | 'wait_for_completion_timeout'> {
  return {
    wait_for_completion_timeout: '100ms', // Wait up to 100ms for the response to return
    ...(options.sessionId
      ? undefined
      : {
          keep_alive: '1m',
          // We still need to do polling for searches not within the context of a search session
        }),
  };
}
