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
import type { ContentListState, ContentListAction } from './types';
import type { ContentListItem } from '../item';

describe('state_reducer', () => {
  const createInitialState = (overrides?: Partial<ContentListState>): ContentListState => ({
    items: [],
    totalItems: 0,
    isLoading: false,
    error: undefined,
    filters: DEFAULT_FILTERS,
    sort: { field: 'updatedAt', direction: 'desc' },
    ...overrides,
  });

  const createMockItem = (id: string): ContentListItem => ({
    id,
    title: `Item ${id}`,
    type: 'dashboard',
  });

  describe('SET_ITEMS', () => {
    it('sets items and totalItems from payload', () => {
      const initialState = createInitialState({ isLoading: true });
      const items = [createMockItem('1'), createMockItem('2')];

      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items, totalItems: 10 },
      };

      const newState = reducer(initialState, action);

      expect(newState.items).toBe(items);
      expect(newState.totalItems).toBe(10);
    });

    it('preserves isLoading state (loading is managed by SET_LOADING)', () => {
      const initialState = createInitialState({ isLoading: true });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: [], totalItems: 0 },
      };

      const newState = reducer(initialState, action);

      expect(newState.isLoading).toBe(true);
    });

    it('clears any existing error', () => {
      const initialState = createInitialState({ error: new Error('Previous error') });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: [], totalItems: 0 },
      };

      const newState = reducer(initialState, action);

      expect(newState.error).toBeUndefined();
    });

    it('preserves other state properties', () => {
      const initialState = createInitialState({
        filters: { search: 'test' },
        sort: { field: 'title', direction: 'asc' },
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: [createMockItem('1')], totalItems: 1 },
      };

      const newState = reducer(initialState, action);

      expect(newState.filters).toEqual({ search: 'test' });
      expect(newState.sort).toEqual({ field: 'title', direction: 'asc' });
    });
  });

  describe('SET_LOADING', () => {
    it('sets isLoading to true', () => {
      const initialState = createInitialState({ isLoading: false });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_LOADING,
        payload: true,
      };

      const newState = reducer(initialState, action);

      expect(newState.isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      const initialState = createInitialState({ isLoading: true });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_LOADING,
        payload: false,
      };

      const newState = reducer(initialState, action);

      expect(newState.isLoading).toBe(false);
    });

    it('preserves other state properties', () => {
      const items = [createMockItem('1')];
      const initialState = createInitialState({ items, totalItems: 1 });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_LOADING,
        payload: true,
      };

      const newState = reducer(initialState, action);

      expect(newState.items).toBe(items);
      expect(newState.totalItems).toBe(1);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error from payload', () => {
      const initialState = createInitialState({ isLoading: true });
      const error = new Error('Fetch failed');
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: error,
      };

      const newState = reducer(initialState, action);

      expect(newState.error).toBe(error);
    });

    it('sets isLoading to false', () => {
      const initialState = createInitialState({ isLoading: true });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: new Error('Fetch failed'),
      };

      const newState = reducer(initialState, action);

      expect(newState.isLoading).toBe(false);
    });

    it('clears error when payload is undefined', () => {
      const initialState = createInitialState({ error: new Error('Previous error') });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: undefined,
      };

      const newState = reducer(initialState, action);

      expect(newState.error).toBeUndefined();
    });

    it('preserves other state properties', () => {
      const items = [createMockItem('1')];
      const initialState = createInitialState({ items, totalItems: 1 });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: new Error('Error'),
      };

      const newState = reducer(initialState, action);

      expect(newState.items).toBe(items);
      expect(newState.totalItems).toBe(1);
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

    it('preserves other state properties', () => {
      const items = [createMockItem('1')];
      const initialState = createInitialState({
        items,
        totalItems: 1,
        isLoading: true,
      });
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'title', direction: 'asc' },
      };

      const newState = reducer(initialState, action);

      expect(newState.items).toBe(items);
      expect(newState.totalItems).toBe(1);
      expect(newState.isLoading).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('returns current state for unknown action types', () => {
      const initialState = createInitialState({ totalItems: 5 });
      const action = { type: 'UNKNOWN_ACTION', payload: {} } as unknown as ContentListAction;

      const newState = reducer(initialState, action);

      expect(newState).toBe(initialState);
    });
  });

  describe('immutability', () => {
    it('returns a new state object for SET_ITEMS', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: [], totalItems: 0 },
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('returns a new state object for SET_LOADING', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_LOADING,
        payload: true,
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

    it('returns a new state object for SET_ERROR', () => {
      const initialState = createInitialState();
      const action: ContentListAction = {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: new Error('Test'),
      };

      const newState = reducer(initialState, action);

      expect(newState).not.toBe(initialState);
    });

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
      const originalItems = initialState.items;
      const originalSort = initialState.sort;

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: [createMockItem('1')], totalItems: 1 },
      });

      expect(initialState.items).toBe(originalItems);
      expect(initialState.sort).toBe(originalSort);
    });
  });
});
