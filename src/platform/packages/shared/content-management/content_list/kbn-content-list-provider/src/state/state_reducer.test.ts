/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reducer, DEFAULT_SELECTION } from './state_reducer';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';
import type { ContentListClientState, ContentListAction } from './types';

describe('state_reducer', () => {
  /**
   * Creates initial client state for testing.
   *
   * Note: The reducer only manages client-controlled state (filters, sort, selection).
   * Query data (items, isLoading, error) is managed by React Query directly.
   */
  const createInitialState = (
    overrides?: Partial<ContentListClientState>
  ): ContentListClientState => ({
    filters: DEFAULT_FILTERS,
    sort: { field: 'updatedAt', direction: 'desc' },
    selection: { ...DEFAULT_SELECTION },
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

    it('preserves sort and filters when setting selection', () => {
      const initialState = createInitialState({
        filters: { search: 'test query' },
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: { ids: ['1'] },
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test query' });
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

    it('preserves sort and filters when clearing selection', () => {
      const initialState = createInitialState({
        filters: { search: 'test query' },
        sort: { field: 'title', direction: 'asc' },
        selection: { selectedIds: ['1'] },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test query' });
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
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
      const originalSelection = initialState.selection;

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      });

      expect(initialState.sort).toBe(originalSort);
      expect(initialState.filters).toBe(originalFilters);
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
  });
});
