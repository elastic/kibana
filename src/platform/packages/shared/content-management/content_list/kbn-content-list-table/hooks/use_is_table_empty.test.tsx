/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { renderHook } from '@testing-library/react';
import {
  useContentListConfig,
  useContentListItems,
  useContentListSearch,
  useContentListFilters,
  type ContentListItem,
} from '@kbn/content-list-provider';
import { useIsTableEmpty } from './use_is_table_empty';

jest.mock('@kbn/content-list-provider', () => ({
  useContentListConfig: jest.fn(),
  useContentListItems: jest.fn(),
  useContentListSearch: jest.fn(),
  useContentListFilters: jest.fn(),
}));

const mockUseContentListConfig = useContentListConfig as jest.MockedFunction<
  typeof useContentListConfig
>;
const mockUseContentListItems = useContentListItems as jest.MockedFunction<
  typeof useContentListItems
>;
const mockUseContentListSearch = useContentListSearch as jest.MockedFunction<
  typeof useContentListSearch
>;
const mockUseContentListFilters = useContentListFilters as jest.MockedFunction<
  typeof useContentListFilters
>;

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Item 1' },
  { id: '2', title: 'Item 2' },
];

const createConfigValue = (
  overrides?: Partial<ReturnType<typeof useContentListConfig>>
): ReturnType<typeof useContentListConfig> =>
  ({
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    dataSource: {
      findItems: jest.fn(),
      transform: (item: ContentListItem) => item,
    },
    isReadOnly: false,
    item: undefined,
    features: {
      selection: undefined,
      analytics: undefined,
      favorites: undefined,
      filtering: undefined,
      globalActions: undefined,
      pagination: undefined,
      preview: undefined,
      recentlyAccessed: undefined,
      search: undefined,
      sorting: undefined,
      urlState: undefined,
    },
    supports: {
      tags: false,
      favorites: false,
      userProfiles: false,
    },
    globalActions: undefined,
    ...overrides,
  } as ReturnType<typeof useContentListConfig>);

const createItemsValue = (
  overrides?: Partial<ReturnType<typeof useContentListItems>>
): ReturnType<typeof useContentListItems> =>
  ({
    items: mockItems,
    totalItems: mockItems.length,
    isLoading: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useContentListItems>);

const createSearchValue = (
  overrides?: Partial<ReturnType<typeof useContentListSearch>>
): ReturnType<typeof useContentListSearch> =>
  ({
    queryText: '',
    setSearch: jest.fn(),
    clearSearch: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useContentListSearch>);

const createFiltersValue = (
  overrides?: Partial<ReturnType<typeof useContentListFilters>>
): ReturnType<typeof useContentListFilters> =>
  ({
    filters: {},
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    setFilter: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useContentListFilters>);

describe('useIsTableEmpty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContentListConfig.mockReturnValue(createConfigValue());
    mockUseContentListItems.mockReturnValue(createItemsValue());
    mockUseContentListSearch.mockReturnValue(createSearchValue());
    mockUseContentListFilters.mockReturnValue(createFiltersValue());
  });

  describe('when items exist', () => {
    it('returns [false, null] when items are present', () => {
      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(false);
      expect(emptyStateComponent).toBeNull();
    });
  });

  describe('when loading', () => {
    it('returns [false, null] while loading even with no items', () => {
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: true }));

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(false);
      expect(emptyStateComponent).toBeNull();
    });
  });

  describe('when error occurs', () => {
    it('returns error empty state when error is present', () => {
      const error = new Error('Failed to load');
      mockUseContentListItems.mockReturnValue(
        createItemsValue({ items: [], isLoading: false, error })
      );

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);
      expect(emptyStateComponent).not.toBeNull();

      // Check that it's the error empty state.
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-error');
    });
  });

  describe('when search is active', () => {
    it('returns no results empty state when search returns no items', () => {
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));
      mockUseContentListSearch.mockReturnValue(createSearchValue({ queryText: 'search term' }));

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);
      expect(emptyStateComponent).not.toBeNull();

      // Check that it's the no results empty state.
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-no-results');
    });

    it('passes onClearSearch when search is active', () => {
      const clearSearch = jest.fn();
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));
      mockUseContentListSearch.mockReturnValue(
        createSearchValue({ queryText: 'search term', clearSearch })
      );

      const { result } = renderHook(() => useIsTableEmpty());

      const [, emptyStateComponent] = result.current;
      const element = emptyStateComponent as ReactElement;
      expect(element.props.onClearSearch).toBe(clearSearch);
    });
  });

  describe('when filters are active', () => {
    it('returns no results empty state when filters return no items', () => {
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));
      mockUseContentListFilters.mockReturnValue(
        createFiltersValue({ filters: { type: 'dashboard' } })
      );

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);
      expect(emptyStateComponent).not.toBeNull();

      // Check that it's the no results empty state.
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-no-results');
    });

    it('passes onClearFilters when filters are active', () => {
      const clearFilters = jest.fn();
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));
      mockUseContentListFilters.mockReturnValue(
        createFiltersValue({
          filters: { type: 'dashboard' },
          clearFilters,
        })
      );

      const { result } = renderHook(() => useIsTableEmpty());

      const [, emptyStateComponent] = result.current;
      const element = emptyStateComponent as ReactElement;
      expect(element.props.onClearFilters).toBe(clearFilters);
    });

    it('detects active filters with array values', () => {
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));
      mockUseContentListFilters.mockReturnValue(
        createFiltersValue({ filters: { tags: ['tag1', 'tag2'] } })
      );

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);

      const element = emptyStateComponent as ReactElement;
      expect(element.props.hasActiveFilters).toBe(true);
    });

    it('ignores empty array filters', () => {
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));
      mockUseContentListFilters.mockReturnValue(createFiltersValue({ filters: { tags: [] } }));

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);

      // Should be no items empty state (not no results).
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-no-items');
    });
  });

  describe('when no items and no filters/search', () => {
    it('returns no items empty state', () => {
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));

      const { result } = renderHook(() => useIsTableEmpty());

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);
      expect(emptyStateComponent).not.toBeNull();

      // Check that it's the no items empty state.
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-no-items');
    });

    it('passes onCreate from globalActions', () => {
      const onCreate = jest.fn();
      mockUseContentListConfig.mockReturnValue(createConfigValue({ globalActions: { onCreate } }));
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));

      const { result } = renderHook(() => useIsTableEmpty());

      const [, emptyStateComponent] = result.current;
      const element = emptyStateComponent as ReactElement;
      expect(element.props.onCreate).toBe(onCreate);
    });
  });

  describe('with filteredItems option', () => {
    it('uses filteredItems instead of provider items', () => {
      const filteredItems: ContentListItem[] = [];

      const { result } = renderHook(() => useIsTableEmpty({ filteredItems }));

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);

      // When local filter is applied, shows no results state.
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-no-results');
    });

    it('shows no results empty state when filteredItems is empty', () => {
      const { result } = renderHook(() => useIsTableEmpty({ filteredItems: [] }));

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(true);

      // Local filter causes no results state.
      const element = emptyStateComponent as ReactElement;
      expect(element.props['data-test-subj']).toBe('content-list-empty-state-no-results');
    });

    it('is not empty when filteredItems contains items', () => {
      const { result } = renderHook(() =>
        useIsTableEmpty({ filteredItems: [{ id: '1', title: 'Filtered Item' }] })
      );

      const [isTableEmpty, emptyStateComponent] = result.current;
      expect(isTableEmpty).toBe(false);
      expect(emptyStateComponent).toBeNull();
    });
  });

  describe('entity name usage', () => {
    it('passes entityName and entityNamePlural to empty states', () => {
      mockUseContentListConfig.mockReturnValue(
        createConfigValue({
          entityName: 'visualization',
          entityNamePlural: 'visualizations',
        })
      );
      mockUseContentListItems.mockReturnValue(createItemsValue({ items: [], isLoading: false }));

      const { result } = renderHook(() => useIsTableEmpty());

      const [, emptyStateComponent] = result.current;
      const element = emptyStateComponent as ReactElement;
      expect(element.props.entityName).toBe('visualization');
      expect(element.props.entityNamePlural).toBe('visualizations');
    });
  });
});
