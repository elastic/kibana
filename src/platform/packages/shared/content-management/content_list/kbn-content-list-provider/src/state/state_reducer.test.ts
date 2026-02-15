/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reducer, DEFAULT_DELETE_STATE } from './state_reducer';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';
import type { ContentListClientState, ContentListAction } from './types';

describe('state_reducer', () => {
  /**
   * Creates initial client state for testing.
   *
   * Note: The reducer only manages client-controlled state (filters, sort, delete).
   * Query data (items, isLoading, error) is managed by React Query directly.
   */
  const createInitialState = (
    overrides?: Partial<ContentListClientState>
  ): ContentListClientState => ({
    filters: DEFAULT_FILTERS,
    sort: { field: 'updatedAt', direction: 'desc' },
    ...DEFAULT_DELETE_STATE,
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

  describe('REQUEST_DELETE', () => {
    const items = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    it('sets deleteRequest with the provided items', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.REQUEST_DELETE,
        payload: { items },
      };

      const newState = reducer(initialState, action);

      expect(newState.deleteRequest).toEqual({ items });
    });

    it('resets isDeleting to false', () => {
      const initialState = createInitialState({ isDeleting: true });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.REQUEST_DELETE,
        payload: { items },
      };

      const newState = reducer(initialState, action);

      expect(newState.isDeleting).toBe(false);
    });

    it('preserves filters and sort', () => {
      const initialState = createInitialState({
        filters: { search: 'test' },
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.REQUEST_DELETE,
        payload: { items },
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test' });
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('CONFIRM_DELETE_START', () => {
    it('sets isDeleting to true', () => {
      const items = [{ id: '1', title: 'Item 1' }];
      const initialState = createInitialState({
        deleteRequest: { items },
        isDeleting: false,
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CONFIRM_DELETE_START,
      };

      const newState = reducer(initialState, action);

      expect(newState.isDeleting).toBe(true);
    });

    it('preserves deleteRequest', () => {
      const items = [{ id: '1', title: 'Item 1' }];
      const initialState = createInitialState({
        deleteRequest: { items },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CONFIRM_DELETE_START,
      };

      const newState = reducer(initialState, action);

      expect(newState.deleteRequest).toEqual({ items });
    });
  });

  describe('CANCEL_DELETE', () => {
    it('clears deleteRequest', () => {
      const items = [{ id: '1', title: 'Item 1' }];
      const initialState = createInitialState({
        deleteRequest: { items },
        isDeleting: false,
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CANCEL_DELETE,
      };

      const newState = reducer(initialState, action);

      expect(newState.deleteRequest).toBeNull();
    });

    it('resets isDeleting to false', () => {
      const initialState = createInitialState({ isDeleting: true });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.CANCEL_DELETE,
      };

      const newState = reducer(initialState, action);

      expect(newState.isDeleting).toBe(false);
    });
  });

  describe('DELETE_COMPLETED', () => {
    it('clears deleteRequest', () => {
      const items = [{ id: '1', title: 'Item 1' }];
      const initialState = createInitialState({
        deleteRequest: { items },
        isDeleting: true,
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.DELETE_COMPLETED,
      };

      const newState = reducer(initialState, action);

      expect(newState.deleteRequest).toBeNull();
    });

    it('resets isDeleting to false', () => {
      const initialState = createInitialState({ isDeleting: true });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.DELETE_COMPLETED,
      };

      const newState = reducer(initialState, action);

      expect(newState.isDeleting).toBe(false);
    });

    it('preserves filters and sort', () => {
      const initialState = createInitialState({
        filters: { search: 'test' },
        sort: { field: 'title', direction: 'asc' },
        deleteRequest: { items: [{ id: '1', title: 'Item 1' }] },
        isDeleting: true,
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.DELETE_COMPLETED,
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test' });
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

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      });

      expect(initialState.sort).toBe(originalSort);
      expect(initialState.filters).toBe(originalFilters);
    });
  });
});
