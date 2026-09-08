/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import { ProfileCache, useProfileCache } from '../../services';
import { useContentListSearch } from '../search/use_content_list_search';
import { useContentListFilters } from './use_content_list_filters';
import { useFilterToggle } from './use_filter_toggle';
import { getIncludeExcludeFilter } from '../../datasource';

// ─────────────────────────────────────────────────────────────────────────────
// Test setup
// ─────────────────────────────────────────────────────────────────────────────

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({ items: [], total: 0 })
);

const mockUser = {
  uid: 'u_jane',
  user: { username: 'jane', email: 'jane@test.com', full_name: 'Jane Test' },
  email: 'jane@test.com',
  fullName: 'Jane Test',
};

const mockBulkResolve = async (uids: string[]) => [mockUser].filter((u) => uids.includes(u.uid));

const createWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) => {
    const profileCache = new ProfileCache(mockBulkResolve);

    return (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        services={{
          userProfiles: {
            bulkResolve: mockBulkResolve,
          },
        }}
        profileCache={profileCache}
      >
        {children}
      </ContentListProvider>
    );
  };

const useHookState = () => {
  const profileCache = useProfileCache();
  return {
    toggle: useFilterToggle('createdBy'),
    filters: useContentListFilters(),
    search: useContentListSearch(),
    profileCache,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// OR-field clauses (added programmatically via useFilterToggle)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the hook and seeds the profile cache so that UID ↔ email
 * resolution works in the field definitions.
 */
const renderWithStore = async () => {
  const hook = renderHook(useHookState, { wrapper: createWrapper() });
  await act(async () => {
    await hook.result.current.profileCache?.ensureLoaded([mockUser.uid]);
  });
  return hook;
};

describe('useFilterToggle — OR-field clauses', () => {
  it('adds an include filter', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.toggle('u_jane'));

    expect(getIncludeExcludeFilter(result.current.filters.filters.createdBy)?.include).toContain(
      'u_jane'
    );
  });

  it('toggles an include off (same polarity → remove)', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.toggle('u_jane'));
    act(() => result.current.toggle('u_jane'));

    expect(result.current.filters.filters.createdBy).toBeUndefined();
  });

  it('adds an exclude filter', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.toggle('u_jane', 'exclude'));

    expect(getIncludeExcludeFilter(result.current.filters.filters.createdBy)?.exclude).toContain(
      'u_jane'
    );
  });

  it('toggles an exclude off (same polarity → remove)', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.toggle('u_jane', 'exclude'));
    act(() => result.current.toggle('u_jane', 'exclude'));

    expect(result.current.filters.filters.createdBy).toBeUndefined();
  });

  it('flips include → exclude (different polarity → swap)', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.toggle('u_jane', 'include'));
    act(() => result.current.toggle('u_jane', 'exclude'));

    const filter = getIncludeExcludeFilter(result.current.filters.filters.createdBy);
    expect(filter?.exclude).toContain('u_jane');
    expect(filter?.include ?? []).not.toContain('u_jane');
  });

  it('flips exclude → include (different polarity → swap)', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.toggle('u_jane', 'exclude'));
    act(() => result.current.toggle('u_jane', 'include'));

    const filter = getIncludeExcludeFilter(result.current.filters.filters.createdBy);
    expect(filter?.include).toContain('u_jane');
    expect(filter?.exclude ?? []).not.toContain('u_jane');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Simple field clauses (from manual typing: `createdBy:email` or `-createdBy:email`)
//
// EUI's parser produces scalar-value clauses for manually-typed `field:value`.
// `hasSimpleFieldClause` is polarity-agnostic, so previously the toggle would
// clear the clause instead of flipping it when the polarity changed.
// ─────────────────────────────────────────────────────────────────────────────

describe('useFilterToggle — simple field clauses (manually typed)', () => {
  it('flips a typed include (createdBy:email) to exclude on exclude toggle', async () => {
    const { result } = await renderWithStore();

    // Simulate the user having typed `createdBy:jane@test.com` in the search bar.
    // This produces a simple (scalar) field clause with match: 'must'.
    act(() => result.current.search.setQueryFromText('createdBy:jane@test.com'));

    // Cmd+click toggles to exclude — must NOT clear, must flip.
    act(() => result.current.toggle('u_jane', 'exclude'));

    const filter = getIncludeExcludeFilter(result.current.filters.filters.createdBy);
    expect(filter?.exclude).toContain('u_jane');
    expect(filter?.include ?? []).not.toContain('u_jane');
  });

  it('flips a typed exclude (-createdBy:email) to include on include toggle', async () => {
    const { result } = await renderWithStore();

    // Simulate having typed `-createdBy:jane@test.com`.
    act(() => result.current.search.setQueryFromText('-createdBy:jane@test.com'));

    // Normal click → must flip to include, not clear.
    act(() => result.current.toggle('u_jane', 'include'));

    const filter = getIncludeExcludeFilter(result.current.filters.filters.createdBy);
    expect(filter?.include).toContain('u_jane');
    expect(filter?.exclude ?? []).not.toContain('u_jane');
  });

  it('toggles a typed include off when clicking with the same include polarity', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.search.setQueryFromText('createdBy:jane@test.com'));

    // Clicking with include polarity on an already-included value → remove.
    act(() => result.current.toggle('u_jane', 'include'));

    expect(result.current.filters.filters.createdBy).toBeUndefined();
  });

  it('toggles a typed exclude off when Cmd+clicking with the same exclude polarity', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.search.setQueryFromText('-createdBy:jane@test.com'));

    // Cmd+clicking with exclude polarity on an already-excluded value → remove.
    act(() => result.current.toggle('u_jane', 'exclude'));

    expect(result.current.filters.filters.createdBy).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Query text preservation
// ─────────────────────────────────────────────────────────────────────────────

describe('useFilterToggle — query text preservation', () => {
  it('preserves free-text search when toggling a filter', async () => {
    const { result } = await renderWithStore();

    act(() => result.current.search.setQueryFromText('my dashboard'));
    act(() => result.current.toggle('u_jane', 'include'));

    expect(result.current.search.queryText).toContain('my dashboard');
    expect(result.current.search.queryText).toContain('jane@test.com');
  });

  it('preserves unparseable query text when toggling a filter', async () => {
    // setQueryFromText accepts raw text (e.g. from URL params) without parsing,
    // so the state may hold a string that EUI's Query.parse cannot process.
    // The toggle must append the new clause rather than silently discarding the
    // original unparseable text.
    const { result } = await renderWithStore();

    // An unclosed parenthesis produces a parse error in EUI's query parser.
    act(() => result.current.search.setQueryFromText('my dashboard (unclosed'));
    act(() => result.current.toggle('u_jane', 'include'));

    // Original text must be retained.
    expect(result.current.search.queryText).toContain('my dashboard (unclosed');
    // The new clause must also be present.
    expect(result.current.search.queryText).toContain('jane@test.com');
  });
});
