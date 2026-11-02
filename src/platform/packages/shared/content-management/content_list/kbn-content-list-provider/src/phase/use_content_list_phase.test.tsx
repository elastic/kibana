/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ContentListProvider } from '../context';
import type { FindItemsParams, FindItemsResult } from '../datasource';
import { contentListQueryClient } from '../query';
import { useContentListPhase } from './use_content_list_phase';
import { useContentListSearch } from '../features';

const buildItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    title: `Item ${i}`,
    type: 'dashboard',
  }));

const createFindItems = (impl: (params: FindItemsParams) => Promise<FindItemsResult>) =>
  jest.fn(impl);

// Each test gets a unique provider id so concurrent/pending queries from a
// prior test cannot be joined from this one via the module-level query
// client.
let providerIdCounter = 0;
const nextProviderId = () => `phase-test-${++providerIdCounter}`;

const renderWithProvider = <T,>(hook: () => T, findItems: ReturnType<typeof createFindItems>) => {
  const id = nextProviderId();
  const result = renderHook(hook, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id={id}
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems }}
      >
        {children}
      </ContentListProvider>
    ),
  });
  return { ...result, id };
};

describe('useContentListPhase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Belt-and-braces: cancel and drop any queries that haven't settled, so
    // a never-resolving promise from one test cannot leak state into the
    // shared module-level query client.
    await contentListQueryClient.cancelQueries();
    contentListQueryClient.clear();
  });

  it("is 'initialLoad' before the first fetch resolves", () => {
    const findItems = createFindItems(
      () => new Promise<FindItemsResult>(() => undefined) // never resolves
    );
    const { result } = renderWithProvider(() => useContentListPhase(), findItems);
    expect(result.current).toBe('initialLoad');
  });

  it("transitions to 'populated' after the first fetch resolves with items", async () => {
    const findItems = createFindItems(async () => ({
      items: buildItems(3),
      total: 3,
    }));
    const { result } = renderWithProvider(() => useContentListPhase(), findItems);

    await waitFor(() => expect(result.current).toBe('populated'));
  });

  it("transitions to 'empty' after the first fetch resolves with zero items and no query", async () => {
    const findItems = createFindItems(async () => ({ items: [], total: 0 }));
    const { result } = renderWithProvider(() => useContentListPhase(), findItems);

    await waitFor(() => expect(result.current).toBe('empty'));
  });

  it("transitions to 'filtered' when a query is active and returns zero hits", async () => {
    // findItems ignores queryText for this test: returns empty for any filter.
    const findItems = createFindItems(async ({ searchQuery }) => {
      if (searchQuery.length > 0) {
        return { items: [], total: 0 };
      }
      return { items: buildItems(2), total: 2 };
    });

    const { result } = renderWithProvider(
      () => ({
        phase: useContentListPhase(),
        search: useContentListSearch(),
      }),
      findItems
    );

    await waitFor(() => expect(result.current.phase).toBe('populated'));

    act(() => {
      result.current.search.setQueryFromText('no-such-thing');
    });

    await waitFor(() => expect(result.current.phase).toBe('filtered'));
  });

  it("does NOT re-enter 'initialLoad' when a filter triggers a refetch", async () => {
    let resolveCurrent: ((result: FindItemsResult) => void) | undefined;
    const findItems = createFindItems(
      ({ searchQuery }) =>
        new Promise<FindItemsResult>((resolve) => {
          if (!searchQuery) {
            resolve({ items: buildItems(5), total: 5 });
          } else {
            resolveCurrent = resolve;
          }
        })
    );

    const { result } = renderWithProvider(
      () => ({
        phase: useContentListPhase(),
        search: useContentListSearch(),
      }),
      findItems
    );

    await waitFor(() => expect(result.current.phase).toBe('populated'));

    act(() => {
      result.current.search.setQueryFromText('tag:foo');
    });

    // While the filter fetch is in flight, phase should be 'filtering',
    // NOT 'initialLoad'.
    await waitFor(() => expect(result.current.phase).toBe('filtering'));

    act(() => {
      resolveCurrent?.({ items: buildItems(2), total: 2 });
    });

    await waitFor(() => expect(result.current.phase).toBe('populated'));
  });
});
