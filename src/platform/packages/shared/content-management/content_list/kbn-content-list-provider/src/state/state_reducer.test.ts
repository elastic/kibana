/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reducer, DEFAULT_SELECTION } from './state_reducer';
import { CONTENT_LIST_ACTIONS } from './types';
import type { ContentListClientState, ContentListAction } from './types';

describe('state_reducer', () => {
  /**
   * Creates initial client state for testing.
   *
   * Note: The reducer only manages client-controlled state (queryText, sort, pagination, selection).
   * Query data (items, isLoading, error) is managed by React Query directly.
   */
  const createInitialState = (
    overrides?: Partial<ContentListClientState>
  ): ContentListClientState => ({
    queryText: '',
    sort: { field: 'updatedAt', direction: 'desc' },
    page: { index: 0, size: 20 },
    selection: { ...DEFAULT_SELECTION },
    ...overrides,
  });

  describe('SET_QUERY', () => {
    it('sets the query text', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'dashboard' },
      };

      const newState = reducer(initialState, action);

      expect(newState.queryText).toBe('dashboard');
    });

    it('resets page index to 0 when query changes', () => {
      const initialState = createInitialState({ page: { index: 5, size: 20 } });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'dashboard' },
      };

      const newState = reducer(initialState, action);

      expect(newState.page.index).toBe(0);
      expect(newState.page.size).toBe(20);
    });

    it('preserves sort when setting query', () => {
      const initialState = createInitialState({
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'test' },
      };

      const newState = reducer(initialState, action);

      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('clears selection when query changes', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1', '2'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'dashboard' },
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual([]);
    });
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

    it('preserves queryText when setting sort', () => {
      const initialState = createInitialState({ queryText: 'my query' });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.queryText).toBe('my query');
    });

    it('clears selection when sort changes', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1', '2'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual([]);
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

    it('preserves sort and queryText when changing page index', () => {
      const initialState = createInitialState({
        queryText: 'test query',
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 1 },
      };

      const newState = reducer(initialState, action);

      expect(newState.queryText).toBe('test query');
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('clears selection when page index changes', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1', '2'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 2 },
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual([]);
    });
  });

  describe('SET_SELECTION', () => {
    it('sets selected IDs', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: { ids: ['1', '3'] },
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual(['1', '3']);
    });

    it('replaces existing selection', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1', '2'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: { ids: ['3'] },
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual(['3']);
    });

    it('preserves sort and queryText when setting selection', () => {
      const initialState = createInitialState({
        queryText: 'test query',
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: { ids: ['1'] },
      };

      const newState = reducer(initialState, action);

      expect(newState.queryText).toBe('test query');
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('CLEAR_SELECTION', () => {
    it('clears all selected IDs', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1', '2', '3'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual([]);
    });

    it('preserves sort and queryText when clearing selection', () => {
      const initialState = createInitialState({
        queryText: 'test query',
        sort: { field: 'title', direction: 'asc' },
        selection: { selectedIds: ['1'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      };

      const newState = reducer(initialState, action);

      expect(newState.queryText).toBe('test query');
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('RESET_QUERY', () => {
    it('hard-resets queryText to empty string (including free-text)', () => {
      const initialState = createInitialState({
        queryText: 'tag:production my search',
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.RESET_QUERY,
      };

      const newState = reducer(initialState, action);

      // `RESET_QUERY` is a hard reset that wipes everything. The
      // `useContentListFilters().clearFilters` hook preserves free-text
      // by dispatching `SET_QUERY` with only the search portion instead.
      expect(newState.queryText).toBe('');
    });

    it('preserves sort when clearing filters', () => {
      const initialState = createInitialState({
        sort: { field: 'title', direction: 'asc' },
        queryText: 'test',
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.RESET_QUERY,
      };

      const newState = reducer(initialState, action);

      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('resets page index to 0 when filters are cleared', () => {
      const initialState = createInitialState({
        queryText: 'test',
        page: { index: 3, size: 20 },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.RESET_QUERY,
      };

      const newState = reducer(initialState, action);

      expect(newState.page.index).toBe(0);
      expect(newState.page.size).toBe(20);
    });

    it('clears selection when filters are cleared', () => {
      const initialState = createInitialState({
        queryText: 'test',
        selection: { selectedIds: ['1', '2'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.RESET_QUERY,
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual([]);
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

    it('preserves sort and queryText when changing page size', () => {
      const initialState = createInitialState({
        queryText: 'test query',
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE,
        payload: { size: 50 },
      };

      const newState = reducer(initialState, action);

      expect(newState.queryText).toBe('test query');
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });

    it('clears selection when page size changes', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1', '2'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE,
        payload: { size: 50 },
      };

      const newState = reducer(initialState, action);

      expect(newState.selection.selectedIds).toEqual([]);
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
      const originalQueryText = initialState.queryText;
      const originalSelection = initialState.selection;

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      });

      expect(initialState.sort).toBe(originalSort);
      expect(initialState.queryText).toBe(originalQueryText);
      expect(initialState.selection).toBe(originalSelection);
    });

    it('returns a new state object for SET_SELECTION', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: { ids: ['1'] },
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('returns a new state object for CLEAR_SELECTION', () => {
      const initialState = createInitialState({
        selection: { selectedIds: ['1'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('returns a new state object for SET_QUERY', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'test' },
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('does not mutate the original queryText on SET_QUERY', () => {
      const initialState = createInitialState();
      const originalQueryText = initialState.queryText;

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'test' },
      });

      expect(initialState.queryText).toBe(originalQueryText);
    });

    it('returns a new state object for RESET_QUERY', () => {
      const initialState = createInitialState({
        queryText: 'test',
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.RESET_QUERY,
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });
  });
});
