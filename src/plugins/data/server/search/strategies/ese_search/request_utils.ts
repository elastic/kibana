/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/server';
import { AsyncSearchGetRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AsyncSearchSubmitRequest } from '@elastic/elasticsearch/lib/api/types';
import { ISearchOptions, UI_SETTINGS } from '../../../../common';
import { getDefaultSearchParams } from '../es_search';
import { SearchSessionsConfigSchema } from '../../../../config';
import {
  getCommonDefaultAsyncGetParams,
  getCommonDefaultAsyncSubmitParams,
} from '../common/async_utils';

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
  return {
    // TODO: adjust for partial results
    batched_reduce_size: 64,
    ...getCommonDefaultAsyncSubmitParams(searchSessionsConfig, options),
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
  return {
    ...getCommonDefaultAsyncGetParams(searchSessionsConfig, options),
  };
}
