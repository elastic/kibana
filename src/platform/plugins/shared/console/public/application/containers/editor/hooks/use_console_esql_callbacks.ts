/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import type { ContextValue } from '../../../contexts';

export const CONSOLE_ESQL_SOURCES_CACHE_INVALIDATE_DELAY = 10 * 60 * 1000;

interface CachedSources {
  /** Value of the entities refresh generation when this entry was fetched. */
  generation: number;
  timestamp: number;
  result: ReturnType<typeof getESQLSources>;
}

interface UseConsoleEsqlCallbacksParams {
  application: ContextValue['services']['application'];
  http: ContextValue['services']['http'];
  licensing: ContextValue['services']['licensing'];
  data: ContextValue['services']['data'];
  /** Reads the latest autocomplete_entities refresh generation for lazy cache invalidation. */
  getEntitiesRefreshGeneration: () => number;
}

export const useConsoleEsqlCallbacks = ({
  application,
  http,
  licensing,
  data,
  getEntitiesRefreshGeneration,
}: UseConsoleEsqlCallbacksParams): ESQLCallbacks => {
  const getSources = useMemo<Required<ESQLCallbacks>['getSources']>(() => {
    let cachedSources: CachedSources | undefined;

    return async () => {
      const entitiesRefreshGeneration = getEntitiesRefreshGeneration();

      // Re-fetch only when there is no cached result yet, the entities have
      // refreshed since it was fetched, or it has gone stale, so autocomplete
      // does not hit the sources API on every keystroke. The staleness window
      // mirrors the ES|QL editor's cache TTL for consistent behavior and still
      // bounds staleness when autocomplete polling is disabled.
      if (
        !cachedSources ||
        cachedSources.generation !== entitiesRefreshGeneration ||
        Date.now() - cachedSources.timestamp > CONSOLE_ESQL_SOURCES_CACHE_INVALIDATE_DELAY
      ) {
        const result = getESQLSources({ application, http }, licensing?.getLicense);
        // Evict the cached entry if this fetch rejects, but only if it is still the
        // current one, so a later successful fetch is never overwritten by a stale failure.
        void result.catch(() => {
          if (cachedSources?.result === result) {
            cachedSources = undefined;
          }
        });

        cachedSources = {
          generation: entitiesRefreshGeneration,
          timestamp: Date.now(),
          result,
        };
      }

      return cachedSources.result;
    };
  }, [application, getEntitiesRefreshGeneration, http, licensing?.getLicense]);

  const getColumnsFor = useCallback(
    async ({ query }: { query?: string } | undefined = {}) => {
      const columns = await getEsqlColumns({
        esqlQuery: query,
        search: data?.search?.search,
      });
      return columns;
    },
    [data?.search?.search]
  );

  return useMemo<ESQLCallbacks>(
    () => ({
      getSources,
      getColumnsFor,
    }),
    [getSources, getColumnsFor]
  );
};
