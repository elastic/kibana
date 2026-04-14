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
import type { CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { ESQLCallbacks, ESQLControlVariable } from '@kbn/esql-types';
import type { ISearchGeneric } from '@kbn/search-types';
import type { TimeRange } from '@kbn/es-query';
import type { FavoritesClient } from '@kbn/content-management-favorites-public';
import {
  getIndexPatternFromESQLQuery,
  getESQLSources,
  getEsqlColumns,
  getJoinIndices,
  getProjectRoutingFromEsqlQuery,
} from '@kbn/esql-utils';
import type { getHistoryItems } from '../history_local_storage';
import type { StarredQueryMetadata } from '../editor_footer/esql_starred_queries_service';

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
    // Keying on effectiveProjectRouting ensures a fresh cache (and therefore a fresh fetch)
    // whenever either the SET statement or the picker selection changes.
    const fn = memoize(
      (...args: [CoreStart, (() => Promise<ILicense | undefined>) | undefined]) => ({
        timestamp: Date.now(),
        result: getESQLSources(...args, undefined, effectiveProjectRouting),
      })
    );

    return { cache: fn.cache, memoizedSources: fn };
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
      () => 'historyStarredItems'
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
      const result = await getJoinIndices(minimalQueryRef.current, core.http, cacheOptions);
      return result;
    },
    [core.http]
  );

  return {
    esqlFieldsCache,
    memoizedFieldsFromESQL,
    dataSourcesCache,
    memoizedSources,
    historyStarredItemsCache,
    memoizedHistoryStarredItems,
    minimalQuery,
    minimalQueryRef,
    getJoinIndicesCallback,
  };
};
