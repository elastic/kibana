/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reducer } from './state_reducer';
import type { ContentListState } from './types';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';
import { createMockItems } from '../test_utils';

describe('state_reducer', () => {
  const initialState: ContentListState = {
    items: [],
    totalItems: 0,
    isLoading: false,
    search: {
      queryText: '',
    },
    filters: {},
    sort: {
      field: 'title',
      direction: 'asc',
    },
    page: {
      index: 0,
      size: 20,
    },
    selectedItems: new Set(),
    isReadOnly: false,
  };

  describe('Data mutations', () => {
    it('should handle SET_ITEMS', () => {
      const mockItems = createMockItems(3);
      const newState = reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: mockItems, totalItems: 3 },
      });

      expect(newState.items).toEqual(mockItems);
      expect(newState.totalItems).toBe(3);
      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBeUndefined();
    });

    it('should handle SET_LOADING', () => {
      const newState = reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_LOADING,
        payload: true,
      });

      expect(newState.isLoading).toBe(true);
    });

    it('should handle SET_ERROR', () => {
      const error = new Error('Test error');
      const newState = reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: error,
      });

      expect(newState.error).toEqual(error);
      expect(newState.isLoading).toBe(false);
    });

    it('should clear error when SET_ERROR receives undefined', () => {
      const stateWithError = {
        ...initialState,
        error: new Error('Previous error'),
      };

      const newState = reducer(stateWithError, {
        type: CONTENT_LIST_ACTIONS.SET_ERROR,
        payload: undefined,
      });

      expect(newState.error).toBeUndefined();
    });
  });

  describe('Search mutations', () => {
    it('should handle SET_SEARCH_QUERY and reset page', () => {
      const stateWithPage = {
        ...initialState,
        page: { index: 2, size: 20 },
      };

      const newState = reducer(stateWithPage, {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH_QUERY,
        payload: 'test query',
      });

      expect(newState.search.queryText).toBe('test query');
      expect(newState.page.index).toBe(0); // Reset to first page
      expect(newState.page.size).toBe(20); // Preserve page size
    });

    it('should handle SET_SEARCH_ERROR', () => {
      const error = new Error('Search error');
      const newState = reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_SEARCH_ERROR,
        payload: error,
      });

      expect(newState.search.error).toEqual(error);
    });

    it('should handle CLEAR_SEARCH_QUERY and reset page', () => {
      const stateWithSearch = {
        ...initialState,
        search: {
          queryText: 'existing query',
          error: new Error('Search error'),
        },
        page: { index: 3, size: 20 },
      };

      const newState = reducer(stateWithSearch, {
        type: CONTENT_LIST_ACTIONS.CLEAR_SEARCH_QUERY,
      });

      expect(newState.search.queryText).toBe('');
      expect(newState.search.error).toBeUndefined();
      expect(newState.page.index).toBe(0);
    });
  });

  describe('Filter mutations', () => {
    it('should handle SET_FILTERS and reset page', () => {
      const stateWithPage = {
        ...initialState,
        page: { index: 4, size: 20 },
      };

      const filters = {
        tags: { include: ['tag1', 'tag2'], exclude: [] },
        users: ['user1'],
        starredOnly: true,
      };

      const newState = reducer(stateWithPage, {
        type: CONTENT_LIST_ACTIONS.SET_FILTERS,
        payload: filters,
      });

      expect(newState.filters).toEqual(filters);
      expect(newState.page.index).toBe(0);
    });

    it('should handle CLEAR_FILTERS and reset page', () => {
      const stateWithFilters = {
        ...initialState,
        filters: {
          tags: { include: ['tag1'], exclude: [] },
          starredOnly: true,
        },
        page: { index: 2, size: 20 },
      };

      const newState = reducer(stateWithFilters, {
        type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS,
      });

      expect(newState.filters).toEqual(DEFAULT_FILTERS);
      expect(newState.page.index).toBe(0);
    });
  });

  describe('Sort mutations', () => {
    it('should handle SET_SORT and reset page', () => {
      const stateWithPage = {
        ...initialState,
        page: { index: 5, size: 20 },
      };

      const newState = reducer(stateWithPage, {
        type: CONTENT_LIST_ACTIONS.SET_SORT,
        payload: { field: 'updatedAt', direction: 'desc' },
      });

      expect(newState.sort).toEqual({ field: 'updatedAt', direction: 'desc' });
      expect(newState.page.index).toBe(0);
    });
  });

  describe('Pagination mutations', () => {
    it('should handle SET_PAGE', () => {
      const newState = reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_PAGE,
        payload: { index: 2, size: 50 },
      });

      expect(newState.page).toEqual({ index: 2, size: 50 });
    });
  });

  describe('Selection mutations', () => {
    const mockItems = createMockItems(5);
    const stateWithItems: ContentListState = {
      ...initialState,
      items: mockItems,
    };

    it('should handle SET_SELECTION', () => {
      const selection = new Set(['item-1', 'item-2', 'item-3']);

      const newState = reducer(stateWithItems, {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: selection,
      });

      expect(newState.selectedItems).toEqual(selection);
    });

    it('should handle TOGGLE_SELECTION to add item', () => {
      const newState = reducer(stateWithItems, {
        type: CONTENT_LIST_ACTIONS.TOGGLE_SELECTION,
        payload: 'item-1',
      });

      expect(newState.selectedItems.has('item-1')).toBe(true);
      expect(newState.selectedItems.size).toBe(1);
    });

    it('should handle TOGGLE_SELECTION to remove item', () => {
      const stateWithSelection = {
        ...stateWithItems,
        selectedItems: new Set(['item-1', 'item-2']),
      };

      const newState = reducer(stateWithSelection, {
        type: CONTENT_LIST_ACTIONS.TOGGLE_SELECTION,
        payload: 'item-1',
      });

      expect(newState.selectedItems.has('item-1')).toBe(false);
      expect(newState.selectedItems.has('item-2')).toBe(true);
      expect(newState.selectedItems.size).toBe(1);
    });

    it('should handle CLEAR_SELECTION', () => {
      const stateWithSelection = {
        ...stateWithItems,
        selectedItems: new Set(['item-1', 'item-2', 'item-3']),
      };

      const newState = reducer(stateWithSelection, {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      });

      expect(newState.selectedItems.size).toBe(0);
    });
  });

  describe('Read-only mode', () => {
    const mockItems = createMockItems(3);
    const readOnlyState: ContentListState = {
      ...initialState,
      items: mockItems,
      isReadOnly: true,
    };

    it('should ignore SET_SELECTION in read-only mode', () => {
      const selection = new Set(['item-1', 'item-2']);

      const newState = reducer(readOnlyState, {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: selection,
      });

      expect(newState.selectedItems.size).toBe(0);
      expect(newState).toEqual(readOnlyState);
    });

    it('should log warning for SET_SELECTION in read-only mode in development', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const selection = new Set(['item-1', 'item-2']);
      reducer(readOnlyState, {
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: selection,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Selection action ignored: list is in read-only mode')
      );

      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should ignore TOGGLE_SELECTION in read-only mode', () => {
      const newState = reducer(readOnlyState, {
        type: CONTENT_LIST_ACTIONS.TOGGLE_SELECTION,
        payload: 'item-1',
      });

      expect(newState.selectedItems.size).toBe(0);
      expect(newState).toEqual(readOnlyState);
    });

    it('should log warning for TOGGLE_SELECTION in read-only mode in development', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      reducer(readOnlyState, {
        type: CONTENT_LIST_ACTIONS.TOGGLE_SELECTION,
        payload: 'item-1',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Selection action ignored: list is in read-only mode')
      );

      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should ignore CLEAR_SELECTION in read-only mode', () => {
      const stateWithSelection = {
        ...readOnlyState,
        selectedItems: new Set(['item-1']),
      };

      const newState = reducer(stateWithSelection, {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      });

      expect(newState.selectedItems.size).toBe(1);
      expect(newState).toEqual(stateWithSelection);
    });

    it('should log warning for CLEAR_SELECTION in read-only mode in development', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const stateWithSelection = {
        ...readOnlyState,
        selectedItems: new Set(['item-1']),
      };

      reducer(stateWithSelection, {
        type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Selection action ignored: list is in read-only mode')
      );

      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Immutability', () => {
    it('should not mutate original state', () => {
      const original = { ...initialState };
      const mockItems = createMockItems(2);

      reducer(initialState, {
        type: CONTENT_LIST_ACTIONS.SET_ITEMS,
        payload: { items: mockItems, totalItems: 2 },
      });

      expect(initialState).toEqual(original);
    });

    it('should create new Set for selectedItems on TOGGLE_SELECTION', () => {
      const stateWithItems = {
        ...initialState,
        items: createMockItems(3),
      };
      const originalSelection = stateWithItems.selectedItems;

      const newState = reducer(stateWithItems, {
        type: CONTENT_LIST_ACTIONS.TOGGLE_SELECTION,
        payload: 'item-1',
      });

      expect(newState.selectedItems).not.toBe(originalSelection);
    });
  });
});
