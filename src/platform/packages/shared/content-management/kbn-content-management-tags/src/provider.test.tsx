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
import type { Tag, ParsedQuery } from './types';
import { ContentManagementTagsProvider, useServices } from './services';

describe('ContentManagementTagsContextProvider', () => {
  const mockTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'Important',
      description: 'Important items',
      color: '#FF0000',
      managed: false,
    },
    { id: 'tag-2', name: 'Urgent', description: 'Urgent items', color: '#FFA500', managed: false },
  ];

  const mockGetTagList = jest.fn(() => mockTags);
  const mockParseSearchQuery = jest.fn(
    (query: string): ParsedQuery => ({
      searchQuery: query,
      tagIds: undefined,
      tagIdsToExclude: undefined,
    })
  );

  const createWrapper = (props?: { parseSearchQuery?: (searchQuery: string) => ParsedQuery }) => {
    return ({ children }: { children: React.ReactNode }) => (
      <ContentManagementTagsProvider
        getTagList={mockGetTagList}
        parseSearchQuery={props?.parseSearchQuery}
      >
        {children}
      </ContentManagementTagsProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('context provision', () => {
    it('provides context to children', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current!.getTagList).toBeDefined();
    });

    it('provides getTagList function', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      const tags = result.current!.getTagList();
      expect(tags).toEqual(mockTags);
      expect(mockGetTagList).toHaveBeenCalled();
    });

    it('includes parseSearchQuery when provided', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper({ parseSearchQuery: mockParseSearchQuery }),
      });

      expect(result.current!.parseSearchQuery).toBeDefined();
      const parsed = result.current!.parseSearchQuery?.('test query');
      expect(parsed).toEqual({
        searchQuery: 'test query',
        tagIds: undefined,
        tagIdsToExclude: undefined,
      });
      expect(mockParseSearchQuery).toHaveBeenCalledWith('test query');
    });

    it('does not include parseSearchQuery when not provided', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      expect(result.current!.parseSearchQuery).toBeUndefined();
    });
  });

  describe('useServices', () => {
    it('returns context when inside provider', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current!.getTagList).toBeDefined();
    });

    it('returns undefined when used outside provider', () => {
      const { result } = renderHook(() => useServices());

      expect(result.current).toBeUndefined();
    });
  });

  describe('stability', () => {
    it('provides consistent context value structure', () => {
      const { result, rerender } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      const firstValue = result.current!;
      rerender();
      const secondValue = result.current!;

      // Context values have the same structure.
      expect(firstValue).toEqual(secondValue);
      expect(Object.keys(firstValue)).toEqual(Object.keys(secondValue));
    });

    it('maintains context structure across renders', () => {
      const { result, rerender } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      const firstValue = result.current;

      rerender();

      // Structure should remain consistent.
      expect(result.current).toEqual(firstValue);
      expect(typeof result.current!.getTagList).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('handles getTagList returning empty array', () => {
      const emptyGetTagList = jest.fn(() => []);
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentManagementTagsProvider
          getTagList={emptyGetTagList}
          parseSearchQuery={mockParseSearchQuery}
        >
          {children}
        </ContentManagementTagsProvider>
      );

      const { result } = renderHook(() => useServices(), {
        wrapper: Wrapper,
      });

      const tags = result.current!.getTagList();
      expect(tags).toEqual([]);
      expect(emptyGetTagList).toHaveBeenCalled();
    });

    it('handles parseSearchQuery with empty query string', () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper({ parseSearchQuery: mockParseSearchQuery }),
      });

      const parsed = result.current!.parseSearchQuery?.('');
      expect(parsed).toBeDefined();
      expect(mockParseSearchQuery).toHaveBeenCalledWith('');
    });

    it('provides stable function references across renders', () => {
      const { result, rerender } = renderHook(() => useServices(), {
        wrapper: createWrapper({ parseSearchQuery: mockParseSearchQuery }),
      });

      const firstGetTagList = result.current!.getTagList;
      const firstParseSearchQuery = result.current!.parseSearchQuery;

      rerender();

      expect(result.current!.getTagList).toBe(firstGetTagList);
      expect(result.current!.parseSearchQuery).toBe(firstParseSearchQuery);
    });
  });
});
