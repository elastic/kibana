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
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import { useContentListConfig } from '@kbn/content-list-provider';
import { ContentListClientProvider } from './provider';
import type { ContentListClientProviderProps } from './provider';
import type { TableListViewFindItemsFn, ContentListClientServices } from './types';

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

  const createMockServices = (pageSize = 20): ContentListClientServices => ({
    uiSettings: { get: jest.fn(() => pageSize) as ContentListClientServices['uiSettings']['get'] },
  });

  const createWrapper = (props?: Partial<ContentListClientProviderProps>) => {
    const defaultFindItems = createMockFindItems([createMockItem('1')]);
    const defaultProps: ContentListClientProviderProps = {
      id: 'test-client-list',
      labels: { entity: 'dashboard', entityPlural: 'dashboards' },
      findItems: defaultFindItems,
      services: createMockServices(),
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
    it('merges uiSettings page size into features by default', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ services: createMockServices(25) }),
      });

      expect(result.current.features).toEqual({
        pagination: { initialPageSize: 25 },
      });
    });

    it('provides features from props with uiSettings page size merged', () => {
      const features = {
        sorting: { initialSort: { field: 'updatedAt', direction: 'desc' as const } },
      };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features }),
      });

      expect(result.current.features).toEqual({
        ...features,
        pagination: { initialPageSize: 20 },
      });
    });

    it('preserves explicit initialPageSize over uiSettings value', () => {
      const features = {
        pagination: { initialPageSize: 50 },
      };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features, services: createMockServices(25) }),
      });

      expect(result.current.features).toEqual(features);
    });

    it('preserves pagination: false without re-enabling pagination', () => {
      const features = { pagination: false as const };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features, services: createMockServices(25) }),
      });

      expect(result.current.features.pagination).toBe(false);
      expect(result.current.supports.pagination).toBe(false);
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

  describe('services', () => {
    it('passes services to the base provider', () => {
      const services = createMockServices(30);

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ services }),
      });

      expect(result.current.services).toBe(services);
    });

    it('reads uiSettings once at mount', () => {
      const services = createMockServices(15);

      const { rerender } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ services }),
      });

      rerender();
      rerender();

      // uiSettings.get should only be called once (at mount).
      expect(services.uiSettings.get).toHaveBeenCalledTimes(1);
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

  describe('starred support gating', () => {
    const createMockFavoritesClient = (): FavoritesClientPublic => ({
      getFavorites: jest.fn().mockResolvedValue({ favoriteIds: [], favoriteMetadata: {} }),
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      getFavoriteType: jest.fn().mockReturnValue('dashboard'),
      reportAddFavoriteClick: jest.fn(),
      reportRemoveFavoriteClick: jest.fn(),
    });

    it('does not crash when favorites service is provided but starred feature is disabled', () => {
      const mockClient = createMockFavoritesClient();

      expect(() => {
        renderHook(() => useContentListConfig(), {
          wrapper: createWrapper({
            services: { ...createMockServices(), favorites: mockClient },
            features: { starred: false },
          }),
        });
      }).not.toThrow();
    });

    it('reports starred as unsupported when the feature is disabled', () => {
      const mockClient = createMockFavoritesClient();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          services: { ...createMockServices(), favorites: mockClient },
          features: { starred: false },
        }),
      });

      expect(result.current.supports.starred).toBe(false);
    });

    it('reports starred as supported when favorites service is provided and feature is not disabled', () => {
      const mockClient = createMockFavoritesClient();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          services: { ...createMockServices(), favorites: mockClient },
        }),
      });

      expect(result.current.supports.starred).toBe(true);
    });

    it('reports starred as unsupported when no favorites service is provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.supports.starred).toBe(false);
    });
  });
});
