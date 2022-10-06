/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AsyncSearchSubmitRequest,
  AsyncSearchGetRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { PluginInitializerContext } from '@kbn/core/server';
import { SearchSessionsConfigSchema } from '../../../../config';
import { ISearchOptions } from '../../../../common';
import { ConfigSchema } from '../../../../config';

/**
 @internal
 */
export function getCommonDefaultAsyncSubmitParams(
  initializerContext: PluginInitializerContext<ConfigSchema>,
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Pick<
  AsyncSearchSubmitRequest,
  'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'
> {
  const useSearchSessions = searchSessionsConfig?.enabled && !!options.sessionId;
  const searchConfig = initializerContext.config.get().search;
  const keepAlive =
    useSearchSessions && options.isStored
      ? `${searchSessionsConfig!.defaultExpiration.asMilliseconds()}ms`
      : `${searchConfig.async_search.keep_alive.asMilliseconds()}ms`;

  return {
    // Wait up to 100ms for the response to return
    wait_for_completion_timeout: `${searchConfig.async_search.wait_for_completion.asMilliseconds()}ms`,
    // If search sessions are used, store and get an async ID even for short running requests.
    keep_on_completion: useSearchSessions,
    // The initial keepalive is as defined in defaultExpiration if search sessions are used or 1m otherwise.
    keep_alive: keepAlive,
  };
}

/**
 @internal
 */
export function getCommonDefaultAsyncGetParams(
  initializerContext: PluginInitializerContext<ConfigSchema>,
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Pick<AsyncSearchGetRequest, 'keep_alive' | 'wait_for_completion_timeout'> {
  const useSearchSessions = searchSessionsConfig?.enabled && !!options.sessionId;
  const searchConfig = initializerContext.config.get().search;

  return {
    // Wait up to 100ms for the response to return
    wait_for_completion_timeout: `${searchConfig.async_search.wait_for_completion.asMilliseconds()}ms`,
    ...(useSearchSessions && options.isStored
      ? // Use session's keep_alive if search belongs to a stored session
        options.isSearchStored || options.isRestore // if search was already stored and extended, then no need to extend keepAlive
        ? {}
        : {
            keep_alive: `${searchSessionsConfig!.defaultExpiration.asMilliseconds()}ms`,
          }
      : {
          // We still need to do polling for searches not within the context of a search session or when search session disabled
          keep_alive: `${searchConfig.async_search.keep_alive.asMilliseconds()}ms`,
        }),
  };
}
