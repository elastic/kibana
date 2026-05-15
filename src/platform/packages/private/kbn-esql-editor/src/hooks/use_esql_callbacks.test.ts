/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { MapCache } from 'lodash';
import type { FavoritesClient } from '@kbn/content-management-favorites-public';
import { useEsqlCallbacks } from './use_esql_callbacks';
import type { StarredQueryMetadata } from '../editor_footer/esql_starred_queries_service';

const createMapCache = (): MapCache => {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      return store as unknown as MapCache;
    }),
    has: jest.fn((key: string) => store.has(key)),
    delete: jest.fn((key: string) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
  };
};

const createDefaultParams = () => {
  const esqlFieldsCache = createMapCache();
  const dataSourcesCache = createMapCache();
  const historyStarredItemsCache = createMapCache();

  // memoizedFieldsFromESQL never resolves so getColumnsFor stays pending,
  // letting us assert on the AbortSignal that was passed in.
  const memoizedFieldsFromESQL = jest.fn(({ signal }: { signal?: AbortSignal }) => ({
    timestamp: Date.now(),
    result: new Promise(() => {
      // capture for assertions via the mock's call args
      void signal;
    }),
  })) as unknown as Parameters<typeof useEsqlCallbacks>[0]['memoizedFieldsFromESQL'];

  const memoizedSources = jest.fn() as unknown as Parameters<
    typeof useEsqlCallbacks
  >[0]['memoizedSources'];
  const memoizedHistoryStarredItems = jest.fn() as unknown as Parameters<
    typeof useEsqlCallbacks
  >[0]['memoizedHistoryStarredItems'];

  const data = {
    query: {
      timefilter: {
        timefilter: {
          getTime: jest.fn().mockReturnValue({ from: 'now-15m', to: 'now' }),
        },
      },
    },
    search: {
      search: jest.fn(),
    },
  } as unknown as Parameters<typeof useEsqlCallbacks>[0]['data'];

  const core = {
    http: {},
    pricing: { getActiveProduct: jest.fn() },
  } as unknown as CoreStart;

  return {
    core,
    data,
    histogramBarTarget: 50,
    minimalQueryRef: { current: 'FROM logs' },
    dataSourcesCache,
    memoizedSources,
    esqlFieldsCache,
    memoizedFieldsFromESQL,
    historyStarredItemsCache,
    memoizedHistoryStarredItems,
    favoritesClient: {} as FavoritesClient<StarredQueryMetadata>,
    getJoinIndicesCallback: jest.fn(),
    enableResourceBrowser: false,
  } as unknown as Parameters<typeof useEsqlCallbacks>[0];
};

describe('useEsqlCallbacks', () => {
  describe('getColumnsFor', () => {
    it('aborts the in-flight request when the editor unmounts', async () => {
      const params = createDefaultParams();
      const { result, unmount } = renderHook(() => useEsqlCallbacks(params));

      // Kick off a request — it stays pending because the mock never resolves.
      void result.current.getColumnsFor!({ query: 'FROM logs | LIMIT 10' });

      const memoized = params.memoizedFieldsFromESQL as unknown as jest.Mock;
      expect(memoized).toHaveBeenCalledTimes(1);
      const signal = memoized.mock.calls[0][0].signal as AbortSignal;
      expect(signal.aborted).toBe(false);

      unmount();

      expect(signal.aborted).toBe(true);
      // Cache entry for the in-flight query is purged so a remount doesn't
      // reuse the now-aborted promise.
      expect(params.esqlFieldsCache.delete).toHaveBeenCalledWith('FROM logs | LIMIT 10');
    });

    it('aborts the previous request when a different query is requested', async () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => useEsqlCallbacks(params));

      void result.current.getColumnsFor!({ query: 'FROM logs | LIMIT 10' });
      const memoized = params.memoizedFieldsFromESQL as unknown as jest.Mock;
      const firstSignal = memoized.mock.calls[0][0].signal as AbortSignal;

      void result.current.getColumnsFor!({ query: 'FROM metrics | LIMIT 10' });
      const secondSignal = memoized.mock.calls[1][0].signal as AbortSignal;

      expect(firstSignal.aborted).toBe(true);
      expect(secondSignal.aborted).toBe(false);
      expect(params.esqlFieldsCache.delete).toHaveBeenCalledWith('FROM logs | LIMIT 10');
    });

    it('does not abort when the same query is requested again', async () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => useEsqlCallbacks(params));

      void result.current.getColumnsFor!({ query: 'FROM logs | LIMIT 10' });
      const memoized = params.memoizedFieldsFromESQL as unknown as jest.Mock;
      const firstSignal = memoized.mock.calls[0][0].signal as AbortSignal;

      void result.current.getColumnsFor!({ query: 'FROM logs | LIMIT 10' });

      expect(firstSignal.aborted).toBe(false);
      expect(params.esqlFieldsCache.delete).not.toHaveBeenCalled();
    });

    it('does not wipe a fresh cache entry when a stale aborted request finally resolves', async () => {
      const params = createDefaultParams();

      // Wire memoizedFieldsFromESQL to behave like lodash memoize on top of the
      // shared cache, so we can observe cache state across calls.
      const deferreds: Array<{ resolve: (value: unknown) => void }> = [];
      (params.memoizedFieldsFromESQL as unknown as jest.Mock).mockImplementation(
        ({ esqlQuery }: { esqlQuery: string }) => {
          if (params.esqlFieldsCache.has(esqlQuery)) {
            return params.esqlFieldsCache.get(esqlQuery);
          }
          let resolve!: (value: unknown) => void;
          const promise = new Promise((res) => {
            resolve = res;
          });
          const entry = { timestamp: Date.now(), result: promise };
          params.esqlFieldsCache.set(esqlQuery, entry);
          deferreds.push({ resolve });
          return entry;
        }
      );

      const { result } = renderHook(() => useEsqlCallbacks(params));

      // A: first request for Q1 — populates cache, awaits.
      void result.current.getColumnsFor!({ query: 'Q1' });
      expect(params.esqlFieldsCache.has('Q1')).toBe(true);

      // B: supersede with Q2 — abort-time cleanup deletes Q1 entry.
      void result.current.getColumnsFor!({ query: 'Q2' });
      expect(params.esqlFieldsCache.has('Q1')).toBe(false);
      expect(params.esqlFieldsCache.has('Q2')).toBe(true);

      // C: re-request Q1 — fresh in-flight entry.
      void result.current.getColumnsFor!({ query: 'Q1' });
      expect(params.esqlFieldsCache.has('Q1')).toBe(true);
      const freshEntry = params.esqlFieldsCache.get('Q1');

      // A's original promise finally resolves; its continuation must not wipe
      // the entry that now belongs to C.
      deferreds[0].resolve([]);
      await Promise.resolve();
      await Promise.resolve();

      expect(params.esqlFieldsCache.has('Q1')).toBe(true);
      expect(params.esqlFieldsCache.get('Q1')).toBe(freshEntry);
    });
  });
});
