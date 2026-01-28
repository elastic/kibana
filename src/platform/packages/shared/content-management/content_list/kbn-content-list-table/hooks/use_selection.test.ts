/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import {
  useContentListConfig,
  useContentListItems,
  useContentListSelection,
  type ContentListItem,
} from '@kbn/content-list-provider';
import { useSelection } from './use_selection';

jest.mock('@kbn/content-list-provider', () => ({
  useContentListConfig: jest.fn(),
  useContentListItems: jest.fn(),
  useContentListSelection: jest.fn(),
}));

const mockUseContentListConfig = useContentListConfig as jest.MockedFunction<
  typeof useContentListConfig
>;
const mockUseContentListItems = useContentListItems as jest.MockedFunction<
  typeof useContentListItems
>;
const mockUseContentListSelection = useContentListSelection as jest.MockedFunction<
  typeof useContentListSelection
>;

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Item 1' },
  { id: '2', title: 'Item 2' },
];

const createConfigValue = (
  overrides?: Partial<ReturnType<typeof useContentListConfig>>
): ReturnType<typeof useContentListConfig> =>
  ({
    entityName: 'item',
    entityNamePlural: 'items',
    dataSource: {
      findItems: jest.fn(),
      transform: (item: ContentListItem) => item,
    },
    isReadOnly: false,
    item: undefined,
    features: {
      selection: { onSelectionDelete: jest.fn() },
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

const createSelectionValue = (
  overrides?: Partial<ReturnType<typeof useContentListSelection>>
): ReturnType<typeof useContentListSelection> =>
  ({
    selectedItems: new Set<string>(),
    selectedCount: 0,
    setSelection: jest.fn(),
    toggleSelection: jest.fn(),
    clearSelection: jest.fn(),
    selectAll: jest.fn(),
    isSelected: jest.fn(),
    getSelectedItems: jest.fn().mockReturnValue([]),
    ...overrides,
  } as ReturnType<typeof useContentListSelection>);

describe('useSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContentListConfig.mockReturnValue(createConfigValue());
    mockUseContentListItems.mockReturnValue(createItemsValue());
    mockUseContentListSelection.mockReturnValue(createSelectionValue());
  });

  it('returns undefined when no selection actions configured', () => {
    mockUseContentListConfig.mockReturnValue(
      createConfigValue({
        features: {
          selection: undefined,
        },
      })
    );

    const { result } = renderHook(() => useSelection());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when read-only', () => {
    mockUseContentListConfig.mockReturnValue(
      createConfigValue({
        isReadOnly: true,
      })
    );

    const { result } = renderHook(() => useSelection());
    expect(result.current).toBeUndefined();
  });

  it('returns selected rows based on provider state', () => {
    mockUseContentListSelection.mockReturnValue(
      createSelectionValue({
        selectedItems: new Set<string>(['2']),
        selectedCount: 1,
      })
    );

    const { result } = renderHook(() => useSelection());
    expect(result.current?.selected).toEqual([mockItems[1]]);
    expect(result.current?.selectable?.(mockItems[0])).toBe(true);
  });

  it('replaces selections for items on the current page', () => {
    const setSelection = jest.fn();
    mockUseContentListSelection.mockReturnValue(
      createSelectionValue({
        selectedItems: new Set<string>(['2']),
        selectedCount: 1,
        setSelection,
      })
    );

    const { result } = renderHook(() => useSelection());
    const selection = result.current;
    expect(selection).toBeDefined();

    act(() => {
      selection?.onSelectionChange?.([mockItems[0]]);
    });

    expect(setSelection).toHaveBeenCalledTimes(1);
    expect(Array.from(setSelection.mock.calls[0][0])).toEqual(['1']);
  });

  it('preserves selections from other pages', () => {
    const setSelection = jest.fn();
    mockUseContentListSelection.mockReturnValue(
      createSelectionValue({
        selectedItems: new Set<string>(['3']),
        selectedCount: 1,
        setSelection,
      })
    );

    const { result } = renderHook(() => useSelection());
    const selection = result.current;

    act(() => {
      selection?.onSelectionChange?.([mockItems[0]]);
    });

    expect(Array.from(setSelection.mock.calls[0][0])).toEqual(['3', '1']);
  });
});
