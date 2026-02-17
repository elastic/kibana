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
   * Note: The reducer only manages client-controlled state (filters, sort, pagination).
   * Query data (items, isLoading, error) is managed by React Query directly.
   */
  const createInitialState = (
    overrides?: Partial<ContentListClientState>
  ): ContentListClientState => ({
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
  });
});
