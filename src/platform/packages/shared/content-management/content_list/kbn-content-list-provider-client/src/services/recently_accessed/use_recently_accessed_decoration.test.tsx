/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { useRecentlyAccessedDecoration } from './use_recently_accessed_decoration';
import type { RecentlyAccessedHistorySource } from './types';
import { RECENT_FIELD } from './recents_filter_renderer';

// Simulate per-component resolver isolation: each `createComponent` call
// returns a unique component whose `resolve` is closure-bound to that call.
// This mirrors the fix in `@kbn/content-list-assembly` where resolvers are
// keyed by component function rather than stored in a shared slot.
jest.mock('@kbn/content-list-toolbar', () => ({
  filter: {
    createComponent: jest.fn((options?: { resolve?: () => { component: React.FC } }) => {
      const resolve = options?.resolve;
      const Component = (props: Record<string, unknown>) => {
        if (!resolve) {
          return null;
        }
        const { component: Inner } = resolve();
        return <Inner {...props} />;
      };
      Component.displayName = 'MockRecentsFilter';
      return Component;
    }),
  },
}));

describe('useRecentlyAccessedDecoration', () => {
  const buildSource = (entries: Array<{ id: string }>): RecentlyAccessedHistorySource => ({
    get: () => entries,
  });

  describe('decorate', () => {
    it('decorates each hit with `recent`/`accessedAt` based on the source order', () => {
      // Most-recent-first; index 0 is highest score.
      const source = buildSource([{ id: 'b' }, { id: 'a' }]);

      const { result } = renderHook(() => useRecentlyAccessedDecoration(source));

      const decorated = result.current.decorate({
        total: 3,
        hits: [
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
          { id: 'c', title: 'C' },
        ],
      });

      expect(decorated.total).toBe(3);
      expect(decorated.hits).toEqual([
        { id: 'a', title: 'A', recent: true, accessedAt: 1 },
        { id: 'b', title: 'B', recent: true, accessedAt: 2 },
        { id: 'c', title: 'C', recent: false, accessedAt: 0 },
      ]);
    });

    it('reads the source fresh on each `decorate` call so subsequent fetches see updates', () => {
      const entries: Array<{ id: string }> = [];
      const source: RecentlyAccessedHistorySource = { get: () => entries.slice() };

      const { result } = renderHook(() => useRecentlyAccessedDecoration(source));

      const first = result.current.decorate({ total: 1, hits: [{ id: 'a' }] });
      expect(first.hits[0]).toMatchObject({ recent: false, accessedAt: 0 });

      entries.push({ id: 'a' });
      const second = result.current.decorate({ total: 1, hits: [{ id: 'a' }] });
      expect(second.hits[0]).toMatchObject({ recent: true, accessedAt: 1 });
    });
  });

  it('exposes the `flag` entry expected by `features.flags`', () => {
    const { result } = renderHook(() => useRecentlyAccessedDecoration(buildSource([{ id: 'a' }])));
    expect(result.current.flag).toEqual({ flagName: RECENT_FIELD, modelKey: 'recent' });
  });

  describe('RecentsFilter', () => {
    it('hides itself when the bound source is empty', () => {
      const source = buildSource([]);
      const { result } = renderHook(() => useRecentlyAccessedDecoration(source));
      const { RecentsFilter } = result.current;

      const { container } = render(<RecentsFilter />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders the toggle button when the bound source has entries', () => {
      const source = buildSource([{ id: 'a' }]);
      const { result } = renderHook(() => useRecentlyAccessedDecoration(source));
      const { RecentsFilter } = result.current;

      // Mocked `filter.createComponent` forwards props to the inner renderer;
      // the inner renderer expects `query`/`onChange` from `EuiSearchBar`.
      // We exercise the visibility branch only.
      render(<RecentsFilter />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('RecentsFilter — per-source isolation (regression)', () => {
    // Regression: the assembly's `customResolver` was a shared single slot.
    // Calling `useRecentlyAccessedDecoration` with a second source overwrote
    // the first resolver, so both RecentsFilter components would use the newest
    // source. Verify that each hook invocation produces an independent filter
    // component that is bound only to its own source.

    it('each RecentsFilter uses its own source independently', () => {
      const sourceA = buildSource([]);
      const sourceB = buildSource([{ id: 'x' }]);

      const { result: resultA } = renderHook(() => useRecentlyAccessedDecoration(sourceA));
      const { result: resultB } = renderHook(() => useRecentlyAccessedDecoration(sourceB));

      // The two RecentsFilter components must be different references because
      // each `useRecentlyAccessedDecoration` call creates a fresh component
      // via `filter.createComponent`.
      expect(resultA.current.RecentsFilter).not.toBe(resultB.current.RecentsFilter);

      // sourceA is empty → filter A hides itself.
      const { container: containerA } = render(<resultA.current.RecentsFilter />);
      expect(containerA).toBeEmptyDOMElement();

      // sourceB has an entry → filter B renders the button.
      render(<resultB.current.RecentsFilter />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
