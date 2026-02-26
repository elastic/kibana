/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { ContentListProvider } from '@kbn/content-list-provider';
import type { FindItemsResult, FindItemsParams, ContentListItem } from '@kbn/content-list-provider';
import { useSelection } from './use_selection';

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Dashboard A' },
  { id: '2', title: 'Dashboard B' },
];

describe('useSelection', () => {
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

  describe('when selection is supported', () => {
    it('returns a selection config object', () => {
      const { result } = renderHook(() => useSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selection).toBeDefined();
      expect(result.current.selection).toHaveProperty('onSelectionChange');
      expect(result.current.selection).toHaveProperty('selected');
      expect(result.current.selection).toHaveProperty('selectable');
    });

    it('returns `selectable` function that always returns true', () => {
      const { result } = renderHook(() => useSelection(), {
        wrapper: createWrapper(),
      });

      const { selectable } = result.current.selection!;
      expect(selectable!(mockItems[0])).toBe(true);
      expect(selectable!(mockItems[1])).toBe(true);
    });

    it('provides `selected` array for controlled selection', () => {
      const { result } = renderHook(() => useSelection(), {
        wrapper: createWrapper(),
      });

      // Initially empty since no items are selected.
      expect(result.current.selection!.selected).toEqual([]);
    });
  });

  describe('when selection is disabled', () => {
    it('returns `undefined` when selection feature is disabled', () => {
      const { result } = renderHook(() => useSelection(), {
        wrapper: createWrapper({ selectionDisabled: true }),
      });

      expect(result.current.selection).toBeUndefined();
    });

    it('returns `undefined` when in read-only mode', () => {
      const { result } = renderHook(() => useSelection(), {
        wrapper: createWrapper({ isReadOnly: true }),
      });

      expect(result.current.selection).toBeUndefined();
    });
  });

  describe('stability', () => {
    it('returns a stable selection config across re-renders', () => {
      const { result, rerender } = renderHook(() => useSelection(), {
        wrapper: createWrapper(),
      });

      const firstSelection = result.current.selection;
      rerender();
      const secondSelection = result.current.selection;

      expect(firstSelection).toBe(secondSelection);
    });
  });
});
