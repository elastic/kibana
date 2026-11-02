/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import { useContentListSelection } from './use_content_list_selection';

const mockItems = [
  { id: '1', title: 'Dashboard A' },
  { id: '2', title: 'Dashboard B' },
  { id: '3', title: 'Dashboard C' },
];

describe('useContentListSelection', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: mockItems,
      total: mockItems.length,
    })
  );

  const createWrapper = (options?: { selectionDisabled?: boolean; isReadOnly?: boolean }) => {
    const { selectionDisabled, isReadOnly } = options ?? {};

    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        isReadOnly={isReadOnly}
        features={{
          ...(selectionDisabled !== undefined && { selection: !selectionDisabled }),
        }}
      >
        {children}
      </ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns empty selection by default', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedItems).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
    });

    it('returns `isSupported` true by default', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('returns `isSupported` false when selection is disabled', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper({ selectionDisabled: true }),
      });

      expect(result.current.isSupported).toBe(false);
    });

    it('returns `isSupported` false when `isReadOnly` is true', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper({ isReadOnly: true }),
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('setSelection', () => {
    it('updates `selectedIds` and `selectedCount`', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelection([mockItems[0], mockItems[2]]);
      });

      expect(result.current.selectedIds).toEqual(['1', '3']);
      expect(result.current.selectedCount).toBe(2);
    });

    it('resolves `selectedItems` from the loaded items list', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelection([mockItems[0], mockItems[2]]);
      });

      expect(result.current.selectedItems).toEqual([
        expect.objectContaining({ id: '1', title: 'Dashboard A' }),
        expect.objectContaining({ id: '3', title: 'Dashboard C' }),
      ]);
    });

    it('is a no-op when selection is disabled', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper({ selectionDisabled: true }),
      });

      act(() => {
        result.current.setSelection([mockItems[0]]);
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
    });

    it('is a no-op when `isReadOnly` is true', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper({ isReadOnly: true }),
      });

      act(() => {
        result.current.setSelection([mockItems[0]]);
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
    });

    it('replaces the previous selection entirely', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelection([mockItems[0], mockItems[1]]);
      });

      expect(result.current.selectedIds).toEqual(['1', '2']);

      act(() => {
        result.current.setSelection([mockItems[2]]);
      });

      expect(result.current.selectedIds).toEqual(['3']);
    });
  });

  describe('clearSelection', () => {
    it('clears all selected items', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelection([mockItems[0], mockItems[1]]);
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
    });

    it('is a no-op when selection is disabled', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper({ selectionDisabled: true }),
      });

      // Should not throw.
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe('isSelected', () => {
    it('returns true for selected items', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelection([mockItems[0], mockItems[2]]);
      });

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('3')).toBe(true);
    });

    it('returns false for unselected items', () => {
      const { result } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelection([mockItems[0]]);
      });

      expect(result.current.isSelected('2')).toBe(false);
      expect(result.current.isSelected('3')).toBe(false);
    });
  });

  describe('function stability', () => {
    it('provides stable `setSelection` reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      const firstSetSelection = result.current.setSelection;
      rerender();
      const secondSetSelection = result.current.setSelection;

      expect(firstSetSelection).toBe(secondSetSelection);
    });

    it('provides stable `clearSelection` reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListSelection(), {
        wrapper: createWrapper(),
      });

      const firstClearSelection = result.current.clearSelection;
      rerender();
      const secondClearSelection = result.current.clearSelection;

      expect(firstClearSelection).toBe(secondClearSelection);
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListSelection());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });
});
