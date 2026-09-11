/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef } from 'react';
import { memoize } from 'lodash';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { ESQLCallbacks, ESQLControlVariable, ESQLSourceResult } from '@kbn/esql-types';
import type { ISearchGeneric } from '@kbn/search-types';
import type { TimeRange } from '@kbn/es-query';
import type { FavoritesClient } from '@kbn/content-management-favorites-public';
import {
  getIndexPatternFromESQLQuery,
  getESQLSources,
  getEsqlColumns,
  getJoinIndices,
  getTimeseriesIndices,
  getProjectRoutingFromEsqlQuery,
  getRemoteClustersFromESQLQuery,
} from '@kbn/esql-utils';
import type { getHistoryItems } from '../history_local_storage';
import type { StarredQueryMetadata } from '../editor_footer/esql_starred_queries_service';
import {
  DATA_SOURCES_CACHE_KEY,
  HISTORY_STARRED_ITEMS_CACHE_KEY,
  JOIN_INDICES_CACHE_KEY,
  TIMESERIES_INDICES_CACHE_KEY,
  clearCacheWhenOld,
} from '../helpers';

interface UseMemoizedCachesParams {
  code: string;
  core: CoreStart;
  favoritesClient: FavoritesClient<StarredQueryMetadata>;
  pickerProjectRouting: string | undefined;
}

export const useMemoizedCaches = ({
  code,
  core,
  favoritesClient,
  pickerProjectRouting,
}: UseMemoizedCachesParams) => {
  const { cache: esqlFieldsCache, memoizedFieldsFromESQL } = useMemo(() => {
    const fn = memoize(
      (
        ...args: [
          {
            esqlQuery: string;
            search: ISearchGeneric;
            timeRange: TimeRange;
            signal?: AbortSignal;
            dropNullColumns?: boolean;
            variables?: ESQLControlVariable[];
          }
        ]
      ) => ({
        timestamp: Date.now(),
        result: getEsqlColumns(...args),
      }),
      ({ esqlQuery }) => esqlQuery
    );

    return { cache: fn.cache, memoizedFieldsFromESQL: fn };
  }, []);

  // `SET project_routing` in the query takes precedence over the project picker selection.
  const setProjectRouting = useMemo(() => getProjectRoutingFromEsqlQuery(code), [code]);
  const effectiveProjectRouting = setProjectRouting ?? pickerProjectRouting;

  const { cache: dataSourcesCache, memoizedSources } = useMemo(() => {
    // effectiveProjectRouting as a useMemo dependency ensures a fresh cache (and therefore a fresh fetch)
    // whenever either the SET statement or the picker selection changes.
    const fn = memoize(
      (
        ...args: [
          CoreStart,
          (() => Promise<ILicense | undefined>) | undefined,
          ((sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>) | undefined,
          AbortSignal | undefined
        ]
      ) => ({
        timestamp: Date.now(),
        result: getESQLSources(...args, effectiveProjectRouting),
      }),
      () => DATA_SOURCES_CACHE_KEY
    );

    return { cache: fn.cache, memoizedSources: fn };
  }, [effectiveProjectRouting]);

  // React-level cache for join indices — recreated when effectiveProjectRouting changes,
  // which discards the old cache entries and forces a fresh fetch with the new routing.
  const { cache: joinIndicesCache, memoizedJoinIndices } = useMemo(() => {
    const fn = memoize(
      (query: string, http: HttpStart) => {
        const result = getJoinIndices(query, http, effectiveProjectRouting);
        const key = getRemoteClustersFromESQLQuery(query)?.join(',') ?? JOIN_INDICES_CACHE_KEY;
        result.catch(() => {
          if (fn.cache.get(key)?.result === result) fn.cache.delete(key);
        });
        return { timestamp: Date.now(), result };
      },
      (query: string) => getRemoteClustersFromESQLQuery(query)?.join(',') ?? JOIN_INDICES_CACHE_KEY
    );
    return { cache: fn.cache, memoizedJoinIndices: fn };
  }, [effectiveProjectRouting]);

  // React-level cache for timeseries indices — recreated when effectiveProjectRouting changes.
  // On rejection the cache entry is removed so the next call retries.
  const { cache: timeseriesIndicesCache, memoizedTimeseriesIndices } = useMemo(() => {
    const fn = memoize(
      (http: HttpStart, signal?: AbortSignal) => {
        const result = getTimeseriesIndices(http, effectiveProjectRouting, signal);
        result.catch(() => {
          if (fn.cache.get(TIMESERIES_INDICES_CACHE_KEY)?.result === result)
            fn.cache.delete(TIMESERIES_INDICES_CACHE_KEY);
        });
        return { timestamp: Date.now(), result };
      },
      () => TIMESERIES_INDICES_CACHE_KEY
    );
    return { cache: fn.cache, memoizedTimeseriesIndices: fn };
  }, [effectiveProjectRouting]);

  const { cache: historyStarredItemsCache, memoizedHistoryStarredItems } = useMemo(() => {
    const fn = memoize(
      (...args: [typeof getHistoryItems, typeof favoritesClient]) => ({
        timestamp: Date.now(),
        result: (async () => {
          const [getHistoryItemsFn, favoritesClientInstance] = args;
          const historyItems = getHistoryItemsFn('desc');
          // exclude error queries from history items as
          // we don't want to suggest them
          const historyStarredItems = historyItems
            .filter((item) => item.status !== 'error')
            .map((item) => item.queryString);

          try {
            const { favoriteMetadata } = (await favoritesClientInstance?.getFavorites()) || {};

            if (favoriteMetadata) {
              Object.keys(favoriteMetadata).forEach((id) => {
                const item = favoriteMetadata[id];
                const { queryString } = item;
                historyStarredItems.push(queryString);
              });
            }
          } catch {
            // do nothing
          }

          return historyStarredItems;
        })(),
      }),
      // Constant key: single cache entry, invalidated via cache.clear() in clearCacheWhenOld()
      () => HISTORY_STARRED_ITEMS_CACHE_KEY
    );

    return { cache: fn.cache, memoizedHistoryStarredItems: fn };
  }, []);

  // Extract source command and build minimal query with cluster prefixes
  const minimalQuery = useMemo(() => {
    const prefix = code.match(/\b(FROM|TS)\b/i)?.[1]?.toUpperCase();
    const indexPattern = getIndexPatternFromESQLQuery(code);

    return prefix && indexPattern ? `${prefix} ${indexPattern}` : '';
  }, [code]);

  const minimalQueryRef = useRef(minimalQuery);
  minimalQueryRef.current = minimalQuery;

  const getJoinIndicesCallback = useCallback<Required<ESQLCallbacks>['getJoinIndices']>(
    async (cacheOptions) => {
      const cacheKey =
        getRemoteClustersFromESQLQuery(minimalQueryRef.current)?.join(',') ??
        JOIN_INDICES_CACHE_KEY;
      if (cacheOptions?.forceRefresh) {
        joinIndicesCache.delete(cacheKey);
      } else {
        clearCacheWhenOld(joinIndicesCache, cacheKey);
      }
      const result = await memoizedJoinIndices(minimalQueryRef.current, core.http).result;
      return result;
    },
    [core.http, joinIndicesCache, memoizedJoinIndices]
  );

  return {
    esqlFieldsCache,
    memoizedFieldsFromESQL,
    dataSourcesCache,
    memoizedSources,
    joinIndicesCache,
    memoizedJoinIndices,
    timeseriesIndicesCache,
    memoizedTimeseriesIndices,
    historyStarredItemsCache,
    memoizedHistoryStarredItems,
    minimalQuery,
    minimalQueryRef,
    getJoinIndicesCallback,
  };
};
