/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Observable } from 'rxjs';
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
  /**
   * Emits whenever Console's REST autocomplete entities refresh (initial load,
   * each poll tick, and each request execution), so the cached ES|QL sources
   * can be invalidated on the same clock instead of waiting out the TTL.
   */
  entitiesRefreshed$: Observable<void>;
}

export const useConsoleEsqlCallbacks = ({
  application,
  http,
  licensing,
  data,
  entitiesRefreshed$,
}: UseConsoleEsqlCallbacksParams): ESQLCallbacks => {
  // Incremented on every entities refresh; a cached sources entry is only
  // served while its generation still matches, which evicts it lazily.
  const entitiesRefreshGenerationRef = useRef(0);

  useEffect(() => {
    const subscription = entitiesRefreshed$.subscribe(() => {
      entitiesRefreshGenerationRef.current += 1;
    });
    return () => subscription.unsubscribe();
  }, [entitiesRefreshed$]);

  const getSources = useMemo<Required<ESQLCallbacks>['getSources']>(() => {
    let cachedSources: CachedSources | undefined;

    return async () => {
      // Re-fetch only when there is no cached result yet, the entities have
      // refreshed since it was fetched, or it has gone stale, so autocomplete
      // does not hit the sources API on every keystroke. The staleness window
      // mirrors the ES|QL editor's cache TTL for consistent behavior and still
      // bounds staleness when autocomplete polling is disabled.
      if (
        !cachedSources ||
        cachedSources.generation !== entitiesRefreshGenerationRef.current ||
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
          generation: entitiesRefreshGenerationRef.current,
          timestamp: Date.now(),
          result,
        };
      }

      return cachedSources.result;
    };
  }, [application, http, licensing?.getLicense]);

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
