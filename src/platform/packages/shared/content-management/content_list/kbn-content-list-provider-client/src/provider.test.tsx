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
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { useContentListConfig } from '@kbn/content-list-provider';
import { ContentListClientProvider } from './provider';
import type { ContentListClientProviderProps } from './provider';
import type { TableListViewFindItemsFn } from './types';

describe('ContentListClientProvider', () => {
  const createMockItem = (id: string): UserContentCommonSchema => ({
    id,
    type: 'dashboard',
    updatedAt: '2024-01-15T10:30:00.000Z',
    references: [],
    attributes: {
      title: `Dashboard ${id}`,
      description: `Description for ${id}`,
    },
  });

  const createMockFindItems = (
    items: UserContentCommonSchema[] = []
  ): jest.Mock<ReturnType<TableListViewFindItemsFn>> => {
    return jest.fn().mockResolvedValue({ hits: items, total: items.length });
  };

  const createWrapper = (props?: Partial<ContentListClientProviderProps>) => {
    const defaultFindItems = createMockFindItems([createMockItem('1')]);
    const defaultProps: ContentListClientProviderProps = {
      id: 'test-client-list',
      labels: { entity: 'dashboard', entityPlural: 'dashboards' },
      findItems: defaultFindItems,
      children: null,
    };

    return ({ children }: { children: React.ReactNode }) => (
      <ContentListClientProvider {...defaultProps} {...props}>
        {children}
      </ContentListClientProvider>
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
          labels: { entity: 'visualization', entityPlural: 'visualizations' },
        }),
      });

      expect(result.current.labels).toEqual({
        entity: 'visualization',
        entityPlural: 'visualizations',
      });
    });

    it('provides id from props', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ id: 'my-dashboard-list' }),
      });

      expect(result.current.id).toBe('my-dashboard-list');
    });

    it('provides isReadOnly from props', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ isReadOnly: true }),
      });

      expect(result.current.isReadOnly).toBe(true);
    });
  });

  describe('dataSource creation', () => {
    it('creates dataSource with findItems', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.dataSource).toBeDefined();
      expect(result.current.dataSource.findItems).toBeDefined();
      expect(typeof result.current.dataSource.findItems).toBe('function');
    });

    it('does not include onFetchSuccess by default', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      // onFetchSuccess is optional and not set by the client provider.
      expect(result.current.dataSource.onFetchSuccess).toBeUndefined();
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
  });

  describe('memoization', () => {
    it('maintains stable dataSource reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      const firstDataSource = result.current.dataSource;
      rerender();
      const secondDataSource = result.current.dataSource;

      expect(firstDataSource).toBe(secondDataSource);
    });

    it('maintains stable findItems reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      const firstFindItems = result.current.dataSource.findItems;
      rerender();
      const secondFindItems = result.current.dataSource.findItems;

      expect(firstFindItems).toBe(secondFindItems);
    });
  });

  describe('queryKeyScope derivation', () => {
    it('derives queryKeyScope from id', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ id: 'dashboard-list' }),
      });

      expect(result.current.queryKeyScope).toBe('dashboard-list-listing');
    });

    it('uses explicit queryKeyScope when provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ id: 'my-list', queryKeyScope: 'custom-scope' }),
      });

      expect(result.current.queryKeyScope).toBe('custom-scope');
    });
  });
});
