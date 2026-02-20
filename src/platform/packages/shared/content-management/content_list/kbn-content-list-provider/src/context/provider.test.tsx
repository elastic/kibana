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
import { ContentListProvider, useContentListConfig } from './provider';
import type { ContentListProviderProps } from './provider';
import type { FindItemsResult, FindItemsParams } from '../datasource';
import type { ContentListItem } from '../item';

describe('ContentListProvider', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

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

  describe('context provision', () => {
    it('provides context to children', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });

    it('provides labels from props', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          labels: { entity: 'dashboard', entityPlural: 'dashboards' },
        }),
      });

      expect(result.current.labels).toEqual({
        entity: 'dashboard',
        entityPlural: 'dashboards',
      });
    });

    it('provides id from props', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ id: 'my-custom-id' }),
      });

      expect(result.current.id).toBe('my-custom-id');
    });

    it('provides isReadOnly from props', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ isReadOnly: true }),
      });

      expect(result.current.isReadOnly).toBe(true);
    });

    it('provides dataSource from props', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.dataSource).toBeDefined();
      expect(result.current.dataSource.findItems).toBeDefined();
    });
  });

  describe('queryKeyScope derivation', () => {
    it('derives queryKeyScope from id when not provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ id: 'my-list' }),
      });

      expect(result.current.queryKeyScope).toBe('my-list-listing');
    });

    it('uses explicit queryKeyScope when provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ id: 'my-list', queryKeyScope: 'custom-scope' }),
      });

      expect(result.current.queryKeyScope).toBe('custom-scope');
    });

    it('uses queryKeyScope without id when only queryKeyScope is provided', () => {
      // Create a wrapper without id but with queryKeyScope.
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentListProvider
          queryKeyScope="standalone-scope"
          labels={{ entity: 'item', entityPlural: 'items' }}
          dataSource={{ findItems: mockFindItems }}
        >
          {children}
        </ContentListProvider>
      );

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: Wrapper,
      });

      expect(result.current.queryKeyScope).toBe('standalone-scope');
    });
  });

  describe('supports flags', () => {
    it('enables sorting by default', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.supports.sorting).toBe(true);
    });

    it('respects sorting: false in features', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features: { sorting: false } }),
      });

      expect(result.current.supports.sorting).toBe(false);
    });

    it('enables sorting when sorting config is provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: { sorting: { initialSort: { field: 'title', direction: 'asc' } } },
        }),
      });

      expect(result.current.supports.sorting).toBe(true);
    });

    it('enables search by default', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.supports.search).toBe(true);
    });

    it('respects search: false in features', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features: { search: false } }),
      });

      expect(result.current.supports.search).toBe(false);
    });

    it('enables search when search config is provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: { search: { initialSearch: 'hello' } },
        }),
      });

      expect(result.current.supports.search).toBe(true);
    });
  });

  describe('features pass-through', () => {
    it('provides empty features by default', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.features).toEqual({});
    });

    it('provides features from props', () => {
      const features = {
        sorting: { initialSort: { field: 'updatedAt', direction: 'desc' as const } },
      };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features }),
      });

      expect(result.current.features).toEqual(features);
    });
  });

  describe('useContentListConfig', () => {
    it('throws when used outside provider', () => {
      // Suppress console.error for expected error.
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListConfig());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });

    it('returns consistent structure across renders', () => {
      const { result, rerender } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      const firstValue = result.current;
      rerender();
      const secondValue = result.current;

      expect(Object.keys(firstValue)).toEqual(Object.keys(secondValue));
    });
  });

  describe('item config', () => {
    it('provides item config when specified', () => {
      const itemConfig = {
        getHref: (item: ContentListItem) => `/view/${item.id}`,
      };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ item: itemConfig }),
      });

      expect(result.current.item).toEqual(itemConfig);
    });

    it('provides undefined item config when not specified', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.item).toBeUndefined();
    });
  });
});
