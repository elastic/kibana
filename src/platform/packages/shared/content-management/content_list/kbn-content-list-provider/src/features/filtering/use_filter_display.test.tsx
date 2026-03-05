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
import { ContentListProvider } from '../../context';
import type { ContentListProviderProps } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import { useFilterDisplay } from './use_filter_display';

describe('useFilterDisplay', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const mockTagsService: ContentManagementTagsServices = {
    getTagList: () => [
      { id: 'tag-1', name: 'Production', description: '', color: '#FF0000', managed: false },
    ],
  };

  const createWrapper = (props?: Partial<ContentListProviderProps>) => {
    const defaultProps: ContentListProviderProps = {
      id: 'test-list',
      labels: { entity: 'item', entityPlural: 'items' },
      dataSource: { findItems: mockFindItems },
      children: null,
      ...props,
    };

    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider {...defaultProps}>{children}</ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasSorting', () => {
    it('returns true when sorting is supported (default)', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasSorting).toBe(true);
    });

    it('returns false when sorting is disabled', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper({ features: { sorting: false } }),
      });

      expect(result.current.hasSorting).toBe(false);
    });
  });

  describe('hasSearch', () => {
    it('returns true when search is supported (default)', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasSearch).toBe(true);
    });

    it('returns false when search is disabled', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper({ features: { search: false } }),
      });

      expect(result.current.hasSearch).toBe(false);
    });
  });

  describe('hasTags', () => {
    it('returns true when tags service is provided', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper({ services: { tags: mockTagsService } }),
      });

      expect(result.current.hasTags).toBe(true);
    });

    it('returns false when no tags service is provided', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasTags).toBe(false);
    });

    it('returns false when tags are explicitly disabled even with service', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper({
          features: { tags: false },
          services: { tags: mockTagsService },
        }),
      });

      expect(result.current.hasTags).toBe(false);
    });
  });

  describe('hasFilters', () => {
    it('returns true when sorting is available', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFilters).toBe(true);
    });

    it('returns true when tags are available', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper({
          features: { sorting: false },
          services: { tags: mockTagsService },
        }),
      });

      expect(result.current.hasFilters).toBe(true);
    });

    it('returns false when neither sorting nor tags are available', () => {
      const { result } = renderHook(() => useFilterDisplay(), {
        wrapper: createWrapper({ features: { sorting: false } }),
      });

      expect(result.current.hasFilters).toBe(false);
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useFilterDisplay());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });
});
