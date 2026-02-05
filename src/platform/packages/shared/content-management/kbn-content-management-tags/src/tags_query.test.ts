/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { Query } from '@elastic/eui';
import { useTags } from './tags_query';
import type { Tag } from './types';

describe('useTags', () => {
  const mockTag1: Tag = {
    id: 'tag-1',
    name: 'Important',
    description: 'Important items',
    color: '#FF0000',
    managed: false,
  };

  const mockTag2: Tag = {
    id: 'tag-2',
    name: 'Urgent',
    description: 'Urgent items',
    color: '#FFA500',
    managed: false,
  };

  const mockItems = [
    {
      id: 'item-1',
      tags: ['tag-1', 'tag-2'],
    },
    {
      id: 'item-2',
      tags: ['tag-1'],
    },
    {
      id: 'item-3',
      tags: ['tag-3'],
    },
    {
      id: 'item-4',
      tags: [],
    },
    {
      id: 'item-5',
    },
  ];

  describe('tagsToTableItemMap', () => {
    it('creates a map of tag IDs to item IDs', () => {
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery: jest.fn(),
          items: mockItems,
        })
      );

      expect(result.current.tagsToTableItemMap).toEqual({
        'tag-1': ['item-1', 'item-2'],
        'tag-2': ['item-1'],
        'tag-3': ['item-3'],
      });
    });

    it('handles items without tags', () => {
      const itemsWithoutTags = [{ id: 'item-1' }, { id: 'item-2' }];

      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery: jest.fn(),
          items: itemsWithoutTags,
        })
      );

      expect(result.current.tagsToTableItemMap).toEqual({});
    });

    it('handles empty items array', () => {
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery: jest.fn(),
          items: [],
        })
      );

      expect(result.current.tagsToTableItemMap).toEqual({});
    });

    it('handles items with multiple tags', () => {
      const itemsWithMultipleTags = [
        {
          id: 'item-1',
          tags: ['tag-1', 'tag-2', 'tag-3'],
        },
      ];

      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery: jest.fn(),
          items: itemsWithMultipleTags,
        })
      );

      expect(result.current.tagsToTableItemMap).toEqual({
        'tag-1': ['item-1'],
        'tag-2': ['item-1'],
        'tag-3': ['item-1'],
      });
    });
  });

  describe('toggleIncludeTagFilter', () => {
    it('adds tag to include filter when not present', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('tag:(Important)');
    });

    it('handles tag with non-array clause value', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('tag:(Important)'), // Single tag, not array
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      // Should remove the tag since it was already present
      expect(calledQuery.text).not.toContain('tag:(Important)');
    });

    it('removes tag from include filter when already present', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).not.toContain('tag:(Important)');
    });

    it('moves tag from exclude to include filter', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('-tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('tag:(Important)');
      expect(calledQuery.text).not.toContain('-tag:(Important)');
    });

    it('handles multiple tags in filter', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag2);
      });

      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('tag:(Important or Urgent)');
    });

    it('removes tag from multiple-tag include filter', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('tag:(Important or Urgent)'), // Multiple tags in OR clause
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1); // Remove Important
      });

      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('Urgent');
      expect(calledQuery.text).not.toContain('Important');
    });
  });

  describe('toggleExcludeTagFilter', () => {
    it('adds tag to exclude filter when not present', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleExcludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('-tag:(Important)');
    });

    it('removes tag from multiple-tag exclude filter', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('-tag:(Important or Urgent)'), // Multiple excluded tags
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleExcludeTagFilter(mockTag2); // Remove Urgent from exclude
      });

      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('Important');
      expect(calledQuery.text).not.toContain('Urgent');
    });

    it('removes tag from exclude filter when already present', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('-tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleExcludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).not.toContain('-tag:(Important)');
    });

    it('moves tag from include to exclude filter', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleExcludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toBe('-tag:(Important)');
    });
  });

  describe('clearTagSelection', () => {
    it('removes all tag filters from query', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('tag:(Important or Urgent) -tag:(Archive)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.clearTagSelection();
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toBe('');
    });

    it('preserves non-tag filters', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('searchTerm tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.clearTagSelection();
      });

      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toBe('searchTerm');
    });

    it('handles empty query', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.clearTagSelection();
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toBe('');
    });
  });

  describe('query updates', () => {
    it('does not mutate original query', () => {
      const originalQuery = Query.parse('tag:(Important)');
      const originalText = originalQuery.text;
      const updateQuery = jest.fn();

      const { result } = renderHook(() =>
        useTags({
          query: originalQuery,
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag2);
      });

      expect(originalQuery.text).toBe(originalText);
    });

    it('calls updateQuery only once per action', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      expect(updateQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles tags with special characters in names', () => {
      const specialTag: Tag = {
        id: 'tag-special',
        name: 'Tag (Special)',
        description: 'Special tag',
        color: '#000000',
        managed: false,
      };

      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(specialTag);
      });

      expect(updateQuery).toHaveBeenCalled();
    });

    it('handles tags without IDs', () => {
      const tagWithoutId: Tag = {
        name: 'No ID',
        description: 'Tag without ID',
        color: '#000000',
        managed: false,
      };

      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(tagWithoutId);
      });

      expect(updateQuery).toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('updates tagsToTableItemMap when items change', () => {
      const { result, rerender } = renderHook(
        ({ items }) =>
          useTags({
            query: Query.parse(''),
            updateQuery: jest.fn(),
            items,
          }),
        { initialProps: { items: mockItems } }
      );

      const initialMap = result.current.tagsToTableItemMap;

      const newItems = [
        {
          id: 'new-item',
          tags: ['tag-1'],
        },
      ];

      rerender({ items: newItems });

      expect(result.current.tagsToTableItemMap).not.toBe(initialMap);
      expect(result.current.tagsToTableItemMap).toEqual({
        'tag-1': ['new-item'],
      });
    });

    it('maintains stable function references when query changes', () => {
      const updateQuery = jest.fn();
      const { result, rerender } = renderHook(
        ({ query }) =>
          useTags({
            query,
            updateQuery,
            items: mockItems,
          }),
        { initialProps: { query: Query.parse('') } }
      );

      const firstToggleInclude = result.current.toggleIncludeTagFilter;
      const firstToggleExclude = result.current.toggleExcludeTagFilter;
      const firstClear = result.current.clearTagSelection;

      rerender({ query: Query.parse('tag:(Important)') });

      // Functions should be recreated when query changes (due to dependency)
      expect(result.current.toggleIncludeTagFilter).not.toBe(firstToggleInclude);
      expect(result.current.toggleExcludeTagFilter).not.toBe(firstToggleExclude);
      expect(result.current.clearTagSelection).not.toBe(firstClear);
    });

    it('maintains stable tagsToTableItemMap reference when items do not change', () => {
      const updateQuery = jest.fn();
      const { result, rerender } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      const firstMap = result.current.tagsToTableItemMap;

      rerender();

      // Map should be the same reference if items haven't changed
      expect(result.current.tagsToTableItemMap).toBe(firstMap);
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple filter toggles in sequence', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag2);
      });

      // Second call should use the original query, not the result of the first call
      // This is expected behavior as the query prop hasn't changed
      expect(updateQuery).toHaveBeenCalledTimes(2);
    });

    it('handles rapid successive calls to same toggle function', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
        result.current.toggleIncludeTagFilter(mockTag1);
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      // All three calls should execute
      expect(updateQuery).toHaveBeenCalledTimes(3);
    });
  });

  describe('complex scenarios', () => {
    it('handles items with overlapping tags', () => {
      const itemsWithOverlap = [
        { id: 'item-1', tags: ['tag-1', 'tag-2', 'tag-3'] },
        { id: 'item-2', tags: ['tag-1', 'tag-2'] },
        { id: 'item-3', tags: ['tag-1'] },
      ];

      const { result } = renderHook(() =>
        useTags({
          query: Query.parse(''),
          updateQuery: jest.fn(),
          items: itemsWithOverlap,
        })
      );

      expect(result.current.tagsToTableItemMap).toEqual({
        'tag-1': ['item-1', 'item-2', 'item-3'],
        'tag-2': ['item-1', 'item-2'],
        'tag-3': ['item-1'],
      });
    });

    it('preserves other query clauses when clearing tags', () => {
      const updateQuery = jest.fn();
      const { result } = renderHook(() =>
        useTags({
          query: Query.parse('searchTerm type:dashboard tag:(Important)'),
          updateQuery,
          items: mockItems,
        })
      );

      act(() => {
        result.current.clearTagSelection();
      });

      const calledQuery = updateQuery.mock.calls[0][0];
      expect(calledQuery.text).toContain('searchTerm');
      expect(calledQuery.text).toContain('type:dashboard');
      expect(calledQuery.text).not.toContain('tag:');
    });

    it('handles switching tag from include to exclude and back', () => {
      const updateQuery = jest.fn();

      // Start with include filter
      const { result, rerender } = renderHook(
        ({ query }) =>
          useTags({
            query,
            updateQuery,
            items: mockItems,
          }),
        { initialProps: { query: Query.parse('tag:(Important)') } }
      );

      // Toggle to exclude
      act(() => {
        result.current.toggleExcludeTagFilter(mockTag1);
      });

      const excludeQuery = updateQuery.mock.calls[0][0];
      expect(excludeQuery.text).toBe('-tag:(Important)');

      // Update the query prop to simulate parent component updating
      updateQuery.mockClear();
      rerender({ query: excludeQuery });

      // Toggle back to include
      act(() => {
        result.current.toggleIncludeTagFilter(mockTag1);
      });

      const includeQuery = updateQuery.mock.calls[0][0];
      expect(includeQuery.text).toBe('tag:(Important)');
    });
  });
});
