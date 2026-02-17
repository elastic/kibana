/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reducer } from './state_reducer';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';
import type { ContentListClientState, ContentListAction } from './types';

describe('state_reducer', () => {
  /**
   * Creates initial client state for testing.
   *
   * Note: The reducer only manages client-controlled state (search, filters, sort, pagination).
   * Query data (items, isLoading, error) is managed by React Query directly.
   */
  const createInitialState = (
    overrides?: Partial<ContentListClientState>
  ): ContentListClientState => ({
    search: { queryText: '' },
    filters: DEFAULT_FILTERS,
    sort: { field: 'updatedAt', direction: 'desc' },
    page: { index: 0, size: 20 },
    ...overrides,
  });

  describe('SET_SORT', () => {
    it('sets sort field and direction', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('updates existing sort', () => {
      const initialState = createInitialState({
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'updatedAt', direction: 'desc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.sort).toEqual({ field: 'updatedAt', direction: 'desc' });
    });

    it('preserves filters when setting sort', () => {
      const initialState = createInitialState({
        filters: { search: 'test query' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test query' });
    });
  });

  describe('SET_PAGE_INDEX', () => {
    it('sets page index', () => {
      const initialState = createInitialState({ page: { index: 0, size: 20 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 3 },
      };

      const newState = reducer(initialState, action);

      expect(newState.page).toEqual({ index: 3, size: 20 });
    });

    it('preserves page size when changing index', () => {
      const initialState = createInitialState({ page: { index: 0, size: 50 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 2 },
      };

      const newState = reducer(initialState, action);

      expect(newState.page.size).toBe(50);
    });

    it('preserves sort and filters when changing page index', () => {
      const initialState = createInitialState({
        filters: { search: 'test query' },
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 1 },
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test query' });
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('SET_SEARCH', () => {
    it('sets search query text and filters atomically', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'dashboard', filters: { search: 'dashboard' } },
      };

      const newState = reducer(initialState, action);

      expect(newState.search.queryText).toBe('dashboard');
      expect(newState.filters).toEqual({ search: 'dashboard' });
    });

    it('resets page index to 0 when search changes', () => {
      const initialState = createInitialState({ page: { index: 5, size: 20 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'dashboard', filters: { search: 'dashboard' } },
      };

      const newState = reducer(initialState, action);

      expect(newState.page.index).toBe(0);
      expect(newState.page.size).toBe(20);
    });

    it('preserves sort when setting search', () => {
      const initialState = createInitialState({
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'test query', filters: { search: 'test query' } },
      };

      const newState = reducer(initialState, action);

      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('allows filters to differ from query text (e.g. tag syntax)', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'tag:prod my search', filters: { search: 'my search' } },
      };

      const newState = reducer(initialState, action);

      expect(newState.search.queryText).toBe('tag:prod my search');
      expect(newState.filters).toEqual({ search: 'my search' });
    });

    it('clears filters when search text is empty', () => {
      const initialState = createInitialState({
        search: { queryText: 'existing' },
        filters: { search: 'existing' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: '', filters: { search: undefined } },
      };

      const newState = reducer(initialState, action);

      expect(newState.search.queryText).toBe('');
      expect(newState.filters).toEqual({ search: undefined });
    });
  });

  describe('CLEAR_FILTERS', () => {
    it('resets filters to defaults', () => {
      const initialState = createInitialState({
        filters: { search: 'something' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS,
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual(DEFAULT_FILTERS);
    });

    it('resets search query text to empty string', () => {
      const initialState = createInitialState({
        search: { queryText: 'tag:prod my search' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS,
      };

      const newState = reducer(initialState, action);

      expect(newState.search.queryText).toBe('');
    });

    it('preserves sort when clearing filters', () => {
      const initialState = createInitialState({
        sort: { field: 'title', direction: 'asc' },
        filters: { search: 'test' },
        search: { queryText: 'test' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS,
      };

      const newState = reducer(initialState, action);

      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('resets page index to 0 when filters are cleared', () => {
      const initialState = createInitialState({
        filters: { search: 'test' },
        search: { queryText: 'test' },
        page: { index: 3, size: 20 },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS,
      };

      const newState = reducer(initialState, action);

      expect(newState.page.index).toBe(0);
      expect(newState.page.size).toBe(20);
    });
  });

  describe('SET_PAGE_SIZE', () => {
    it('sets page size and resets index to 0', () => {
      const initialState = createInitialState({ page: { index: 3, size: 20 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE,
        payload: { size: 50 },
      };

      const newState = reducer(initialState, action);

      expect(newState.page).toEqual({ index: 0, size: 50 });
    });

    it('resets index even when already on page 0', () => {
      const initialState = createInitialState({ page: { index: 0, size: 20 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE,
        payload: { size: 100 },
      };

      const newState = reducer(initialState, action);

      expect(newState.page).toEqual({ index: 0, size: 100 });
    });

    it('preserves sort and filters when changing page size', () => {
      const initialState = createInitialState({
        filters: { search: 'test query' },
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE,
        payload: { size: 50 },
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test query' });
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('SET_SORT resets page index', () => {
    it('resets page index to 0 when sort changes', () => {
      const initialState = createInitialState({ page: { index: 3, size: 20 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.page.index).toBe(0);
      expect(newState.page.size).toBe(20);
    });
  });

  describe('unknown action', () => {
    it('returns current state for unknown action types', () => {
      const initialState = createInitialState();
      const action = { type: 'UNKNOWN_ACTION', payload: {} } as unknown as ContentListAction;

      const newState = reducer(initialState, action);

      expect(newState).toBe(initialState);
    });
  });

  describe('immutability', () => {
    it('returns a new state object for SET_SORT', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('does not mutate the original state', () => {
      const initialState = createInitialState();
      const originalSort = initialState.sort;
      const originalFilters = initialState.filters;

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      });

      expect(initialState.sort).toBe(originalSort);
      expect(initialState.filters).toBe(originalFilters);
    });

    it('returns a new state object for SET_SEARCH', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'test', filters: { search: 'test' } },
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('does not mutate the original search or filters on SET_SEARCH', () => {
      const initialState = createInitialState();
      const originalSearch = initialState.search;
      const originalFilters = initialState.filters;

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH,
        payload: { queryText: 'test', filters: { search: 'test' } },
      });

      expect(initialState.search).toBe(originalSearch);
      expect(initialState.filters).toBe(originalFilters);
    });

    it('returns a new state object for CLEAR_FILTERS', () => {
      const initialState = createInitialState({
        filters: { search: 'test' },
        search: { queryText: 'test' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS,
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });
  });
});
