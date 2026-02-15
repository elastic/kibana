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
import { useDeleteAction } from './use_delete_action';
import { useContentListState } from '../../state/use_content_list_state';

describe('useDeleteAction', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const mockOnDelete = jest.fn(async () => {});

  const createWrapper = (options?: { isReadOnly?: boolean; withOnDelete?: boolean }) => {
    const { isReadOnly, withOnDelete = true } = options ?? {};

    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        item={withOnDelete ? { onDelete: mockOnDelete } : undefined}
        isReadOnly={isReadOnly}
      >
        {children}
      </ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSupported', () => {
    it('returns true when onDelete is provided and not read-only', () => {
      const { result } = renderHook(() => useDeleteAction(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('returns false when onDelete is not provided', () => {
      const { result } = renderHook(() => useDeleteAction(), {
        wrapper: createWrapper({ withOnDelete: false }),
      });

      expect(result.current.isSupported).toBe(false);
    });

    it('returns false when isReadOnly is true', () => {
      const { result } = renderHook(() => useDeleteAction(), {
        wrapper: createWrapper({ isReadOnly: true }),
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('requestDelete', () => {
    it('dispatches REQUEST_DELETE with the provided items', () => {
      const items = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' },
      ];

      const { result } = renderHook(
        () => ({
          deleteAction: useDeleteAction(),
          state: useContentListState(),
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteAction.requestDelete(items);
      });

      expect(result.current.state.state.deleteRequest).toEqual({ items });
    });

    it('is a no-op when delete is not supported', () => {
      const items = [{ id: '1', title: 'Item 1' }];

      const { result } = renderHook(
        () => ({
          deleteAction: useDeleteAction(),
          state: useContentListState(),
        }),
        { wrapper: createWrapper({ withOnDelete: false }) }
      );

      act(() => {
        result.current.deleteAction.requestDelete(items);
      });

      expect(result.current.state.state.deleteRequest).toBeNull();
    });
  });

  describe('isDeleting', () => {
    it('returns false initially', () => {
      const { result } = renderHook(() => useDeleteAction(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('function stability', () => {
    it('provides stable requestDelete reference across renders', () => {
      const { result, rerender } = renderHook(() => useDeleteAction(), {
        wrapper: createWrapper(),
      });

      const firstRequestDelete = result.current.requestDelete;
      rerender();
      const secondRequestDelete = result.current.requestDelete;

      expect(firstRequestDelete).toBe(secondRequestDelete);
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      // Suppress console.error for expected error.
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useDeleteAction());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });
});
