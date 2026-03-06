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
import { getIncludeExcludeFilter } from '../../datasource';
import { useContentListFilters } from './use_content_list_filters';
import { useContentListSearch } from '../search/use_content_list_search';
import { useTagFilterToggle } from './use_tag_filter_toggle';

describe('useTagFilterToggle', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) =>
      (
        <ContentListProvider
          id="test-list"
          labels={{ entity: 'item', entityPlural: 'items' }}
          dataSource={{ findItems: mockFindItems }}
        >
          {children}
        </ContentListProvider>
      );

  const useToggleState = () => ({
    toggle: useTagFilterToggle(),
    filters: useContentListFilters(),
    search: useContentListSearch(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('include (withModifierKey: false)', () => {
    it('adds a tag to include filters', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.filters.filters.tag).toEqual({
        include: ['tag-1'],
        exclude: [],
      });
    });

    it('removes a tag from include on second call (toggle off)', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.filters.filters.tag).toBeUndefined();
    });

    it('removes the tag from exclude when adding to include', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      // First exclude the tag.
      act(() => {
        result.current.toggle('tag-1', 'Production', true);
      });

      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.exclude).toContain(
        'tag-1'
      );

      // Now include it — should move from exclude to include.
      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.include).toContain(
        'tag-1'
      );
      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.exclude).not.toContain(
        'tag-1'
      );
    });

    it('accumulates multiple include tags', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      act(() => {
        result.current.toggle('tag-2', 'Development', false);
      });

      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.include).toEqual([
        'tag-1',
        'tag-2',
      ]);
    });
  });

  describe('exclude (withModifierKey: true)', () => {
    it('adds a tag to exclude filters', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', true);
      });

      expect(result.current.filters.filters.tag).toEqual({
        include: [],
        exclude: ['tag-1'],
      });
    });

    it('removes a tag from exclude on second modifier call (toggle off)', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', true);
      });

      act(() => {
        result.current.toggle('tag-1', 'Production', true);
      });

      expect(result.current.filters.filters.tag).toBeUndefined();
    });

    it('removes the tag from include when adding to exclude', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      // First include the tag.
      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.include).toContain(
        'tag-1'
      );

      // Now exclude it — should move from include to exclude.
      act(() => {
        result.current.toggle('tag-1', 'Production', true);
      });

      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.include).not.toContain(
        'tag-1'
      );
      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.exclude).toContain(
        'tag-1'
      );
    });
  });

  describe('query text synchronization', () => {
    it('updates query text with tag syntax when including a tag', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.search.search).toContain('Production');
    });

    it('removes tag syntax from query text when toggling off', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.search.search).toContain('Production');

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.search.search).not.toContain('Production');
    });

    it('preserves existing free-text search when toggling a tag', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      // Set search text first.
      act(() => {
        result.current.search.setSearch('dashboard', { search: 'dashboard' });
      });

      // Toggle a tag — free text should be preserved.
      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.search.search).toContain('dashboard');
      expect(result.current.search.search).toContain('Production');
    });
  });

  describe('error resilience', () => {
    it('preserves query text and still updates filters when `Query.parse` throws', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      // Set query text to something unparseable by EUI's strict parser.
      act(() => {
        result.current.search.setSearch('title:(', { search: 'title:(' });
      });

      // Toggle a tag — filters should still update even though query text can't be parsed.
      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.include).toContain(
        'tag-1'
      );
      // Query text should be preserved unchanged since parsing failed.
      expect(result.current.search.search).toContain('title:(');
    });
  });

  describe('normalization', () => {
    it('returns `undefined` tags when both include and exclude become empty', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      // Add then remove — should normalize back to `undefined`.
      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.filters.filters.tag).toBeDefined();

      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.filters.filters.tag).toBeUndefined();
    });

    it('preserves existing search filter when toggling tags', () => {
      const { result } = renderHook(useToggleState, { wrapper: createWrapper() });

      // Set a search filter first via SET_SEARCH.
      act(() => {
        result.current.search.setSearch('dashboard', { search: 'dashboard' });
      });

      // Toggle a tag — search filter should be preserved.
      act(() => {
        result.current.toggle('tag-1', 'Production', false);
      });

      expect(result.current.filters.filters.search).toBe('dashboard');
      expect(getIncludeExcludeFilter(result.current.filters.filters.tag)?.include).toContain(
        'tag-1'
      );
    });
  });
});
