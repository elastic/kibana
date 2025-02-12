/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core/server';
import { AsyncSearchGetRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AsyncSearchSubmitRequest } from '@elastic/elasticsearch/lib/api/types';
import { ISearchOptions } from '@kbn/search-types';
import { UI_SETTINGS } from '../../../../common';
import { getDefaultSearchParams } from '../es_search';
import { SearchConfigSchema } from '../../../config';
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
  searchConfig: SearchConfigSchema,
  options: ISearchOptions
): Promise<
  Pick<
    AsyncSearchSubmitRequest,
    // @ts-expect-error 'keep_alive' has been removed from the spec due to a misunderstanding, but it still works
    | 'batched_reduce_size'
    | 'ccs_minimize_roundtrips'
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
    batched_reduce_size: searchConfig.asyncSearch.batchedReduceSize,
    // Decreases delays due to network when using CCS
    ccs_minimize_roundtrips: true,
    ...getCommonDefaultAsyncSubmitParams(searchConfig, options),
    ...(await getIgnoreThrottled(uiSettingsClient)),
    ...(await getDefaultSearchParams(uiSettingsClient)),
  };
}

/**
 @internal
 */
export function getDefaultAsyncGetParams(
  searchConfig: SearchConfigSchema,
  options: ISearchOptions
): Pick<AsyncSearchGetRequest, 'keep_alive' | 'wait_for_completion_timeout'> {
  return {
    ...getCommonDefaultAsyncGetParams(searchConfig, options),
  };
}
