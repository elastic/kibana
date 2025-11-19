/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useContentListSelection } from './use_content_list_selection';
import { useContentListItems } from '../../state/use_content_list_items';
import { renderHookWithProvider, createMockItems, createMockFindItems } from '../../test_utils';

describe('useContentListSelection', () => {
  it('should return initial empty selection', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection());

    expect(result.current.selectedItems.size).toBe(0);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should toggle selection for an item', async () => {
    const mockItems = createMockItems(5);
    const { result } = await renderHookWithProvider(() => useContentListSelection(), {
      providerOverrides: {
        dataSource: { findItems: createMockFindItems(mockItems) },
      },
    });

    expect(result.current.selectedItems.size).toBe(0);

    act(() => {
      result.current.toggleSelection('item-1');
    });

    expect(result.current.selectedItems.has('item-1')).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    // Toggle again to deselect
    act(() => {
      result.current.toggleSelection('item-1');
    });

    expect(result.current.selectedItems.has('item-1')).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should set selection with Set', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection());

    const selection = new Set(['item-1', 'item-2', 'item-3']);

    act(() => {
      result.current.setSelection(selection);
    });

    expect(result.current.selectedItems.size).toBe(3);
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.selectedItems).toEqual(selection);
  });

  it('should clear all selections', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection());

    // Set some selection
    act(() => {
      result.current.setSelection(new Set(['item-1', 'item-2']));
    });

    expect(result.current.selectedCount).toBe(2);

    // Clear it
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedItems.size).toBe(0);
  });

  it('should select all current items', async () => {
    const mockItems = createMockItems(5);
    // Use both hooks to ensure items are loaded before selectAll
    const { result } = await renderHookWithProvider(
      () => ({
        selection: useContentListSelection(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
        },
      }
    );

    // Wait for items to be loaded
    await waitFor(() => {
      expect(result.current.items.items.length).toBe(5);
    });

    expect(result.current.selection.selectedCount).toBe(0);

    act(() => {
      result.current.selection.selectAll();
    });

    expect(result.current.selection.selectedCount).toBe(5);
    expect(result.current.selection.selectedItems.has('item-1')).toBe(true);
    expect(result.current.selection.selectedItems.has('item-5')).toBe(true);
  });

  it('should check if item is selected', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection());

    act(() => {
      result.current.setSelection(new Set(['item-1', 'item-3']));
    });

    expect(result.current.isSelected('item-1')).toBe(true);
    expect(result.current.isSelected('item-2')).toBe(false);
    expect(result.current.isSelected('item-3')).toBe(true);
  });

  it('should get selected items as array', async () => {
    const mockItems = createMockItems(5);
    const { result } = await renderHookWithProvider(() => useContentListSelection(), {
      providerOverrides: {
        dataSource: { findItems: createMockFindItems(mockItems) },
      },
    });

    expect(result.current.selectedCount).toBe(0);

    act(() => {
      result.current.setSelection(new Set(['item-1', 'item-3']));
    });

    const selectedItems = result.current.getSelectedItems();

    expect(selectedItems.length).toBe(2);
    expect(selectedItems.map((i) => i.id)).toContain('item-1');
    expect(selectedItems.map((i) => i.id)).toContain('item-3');
  });

  it('should respect read-only mode', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection(), {
      providerOverrides: {
        isReadOnly: true,
      },
    });

    // Try to select an item
    act(() => {
      result.current.toggleSelection('item-1');
    });

    // Selection should remain empty due to read-only mode
    expect(result.current.selectedCount).toBe(0);

    // Try to set selection
    act(() => {
      result.current.setSelection(new Set(['item-1']));
    });

    expect(result.current.selectedCount).toBe(0);
  });

  it('should provide all selection functions', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection());

    expect(typeof result.current.setSelection).toBe('function');
    expect(typeof result.current.toggleSelection).toBe('function');
    expect(typeof result.current.clearSelection).toBe('function');
    expect(typeof result.current.selectAll).toBe('function');
    expect(typeof result.current.isSelected).toBe('function');
    expect(typeof result.current.getSelectedItems).toBe('function');
  });

  it('should memoize callbacks', async () => {
    const { result, rerender } = await renderHookWithProvider(() => useContentListSelection());

    const firstSetSelection = result.current.setSelection;
    const firstToggleSelection = result.current.toggleSelection;
    const firstClearSelection = result.current.clearSelection;
    const firstSelectAll = result.current.selectAll;

    rerender();

    expect(result.current.setSelection).toBe(firstSetSelection);
    expect(result.current.toggleSelection).toBe(firstToggleSelection);
    expect(result.current.clearSelection).toBe(firstClearSelection);
    expect(result.current.selectAll).toBe(firstSelectAll);
  });

  it('should update isSelected when selection changes', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSelection());

    expect(result.current.isSelected('item-1')).toBe(false);

    act(() => {
      result.current.toggleSelection('item-1');
    });

    expect(result.current.isSelected('item-1')).toBe(true);
  });

  it('should update getSelectedItems when items change', async () => {
    const mockItems = createMockItems(5);
    // Use both hooks to ensure items are loaded before selectAll
    const { result } = await renderHookWithProvider(
      () => ({
        selection: useContentListSelection(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
        },
      }
    );

    // Wait for items to be loaded
    await waitFor(() => {
      expect(result.current.items.items.length).toBe(5);
    });

    expect(result.current.selection.selectedCount).toBe(0);

    act(() => {
      result.current.selection.selectAll();
    });

    const selectedItems = result.current.selection.getSelectedItems();
    expect(selectedItems.length).toBe(5);
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListSelection());
    }).toThrow('ContentList hooks must be used within ContentListProvider');

    consoleError.mockRestore();
  });
});
