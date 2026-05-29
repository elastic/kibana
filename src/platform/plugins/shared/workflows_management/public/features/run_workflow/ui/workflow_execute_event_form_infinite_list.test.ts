/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { SearchTriggerEventLogHit, SearchTriggerEventLogResult } from '@kbn/workflows-ui';
import { useAccumulatedTriggerEventSearchPages } from './workflow_execute_event_form_infinite_list';

const hit = (id: string, source: Record<string, unknown> = {}): SearchTriggerEventLogHit => ({
  id,
  source,
});

const searchResultForPage = (
  hits: SearchTriggerEventLogHit[],
  page: number
): SearchTriggerEventLogResult => ({
  hits,
  total: hits.length,
  page,
  size: 100,
});

describe('useAccumulatedTriggerEventSearchPages', () => {
  it('stores page 0 hits on first fetch', () => {
    const hits = [hit('a'), hit('b')];
    const { result } = renderHook(() =>
      useAccumulatedTriggerEventSearchPages(searchResultForPage(hits, 1), 0, false)
    );

    expect(result.current[0]).toEqual(hits);
  });

  it('no-ops page 0 update when hit ids are unchanged', () => {
    const initialHits = [hit('a', { x: 1 }), hit('b', { y: 2 })];
    const { result, rerender } = renderHook(
      ({ searchResult }) => useAccumulatedTriggerEventSearchPages(searchResult, 0, false),
      {
        initialProps: {
          searchResult: searchResultForPage(initialHits, 1),
        },
      }
    );

    const accumulatedBefore = result.current[0];
    rerender({
      searchResult: searchResultForPage([hit('a', { x: 99 }), hit('b', { y: 99 })], 1),
    });

    expect(result.current[0]).toBe(accumulatedBefore);
  });

  it('replaces page 0 hits when ids change', () => {
    const { result, rerender } = renderHook(
      ({ searchResult }) => useAccumulatedTriggerEventSearchPages(searchResult, 0, false),
      {
        initialProps: {
          searchResult: searchResultForPage([hit('a'), hit('b')], 1),
        },
      }
    );

    rerender({
      searchResult: searchResultForPage([hit('c')], 1),
    });

    expect(result.current[0]).toEqual([hit('c')]);
  });

  it('appends later pages without duplicating ids', () => {
    const { result, rerender } = renderHook(
      ({ searchResult, pageIndex }) =>
        useAccumulatedTriggerEventSearchPages(searchResult, pageIndex, false),
      {
        initialProps: {
          searchResult: searchResultForPage([hit('a')], 1),
          pageIndex: 0,
        },
      }
    );

    rerender({
      searchResult: searchResultForPage([hit('a'), hit('b')], 2),
      pageIndex: 1,
    });

    expect(result.current[0]).toEqual([hit('a'), hit('b')]);
  });

  it('ignores stale pages and previous-data responses', () => {
    const { result, rerender } = renderHook(
      ({ searchResult, pageIndex, isPreviousData }) =>
        useAccumulatedTriggerEventSearchPages(searchResult, pageIndex, isPreviousData),
      {
        initialProps: {
          searchResult: searchResultForPage([hit('a')], 1),
          pageIndex: 0,
          isPreviousData: false,
        },
      }
    );

    rerender({
      searchResult: searchResultForPage([hit('stale')], 2),
      pageIndex: 0,
      isPreviousData: false,
    });
    expect(result.current[0]).toEqual([hit('a')]);

    rerender({
      searchResult: searchResultForPage([hit('fresh')], 1),
      pageIndex: 0,
      isPreviousData: true,
    });
    expect(result.current[0]).toEqual([hit('a')]);
  });
});
