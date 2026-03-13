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
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  useContentListConfig,
  isFilterFeatureConfig,
  type FilterFeatureConfig,
  type FilterFacet,
  type UserProfileService,
  TAG_FILTER_ID,
} from '@kbn/content-list-provider';
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
    it('provides no extra features by default (no services)', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      // createdBy and tags are undefined when no services are provided.
      expect(result.current.features.createdBy).toBeUndefined();
      expect(result.current.features.tags).toBeUndefined();
    });

    it('provides sorting feature from props', () => {
      const features = {
        sorting: { initialSort: { field: 'updatedAt', direction: 'desc' as const } },
      };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features }),
      });

      expect(result.current.features.sorting).toEqual(features.sorting);
    });
  });

  describe('FilterFeatureConfig auto-build', () => {
    const mockUserProfileService: UserProfileService = {
      getUserProfile: jest.fn(),
      bulkGetUserProfiles: jest.fn().mockResolvedValue([]),
    };

    const mockTagsService = {
      getTagList: jest.fn().mockReturnValue([]),
      parseSearchQuery: jest.fn(),
    };

    it('auto-builds FilterFeatureConfig for createdBy when userProfile service is provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ services: { userProfile: mockUserProfileService } }),
      });

      expect(isFilterFeatureConfig(result.current.features.createdBy)).toBe(true);
    });

    it('auto-builds FilterFeatureConfig for tags when tags service provides getTagList', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ services: { tags: mockTagsService } }),
      });

      expect(isFilterFeatureConfig(result.current.features.tags)).toBe(true);
    });

    it('keeps createdBy false when explicitly disabled even with userProfile service', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: { createdBy: false },
          services: { userProfile: mockUserProfileService },
        }),
      });

      expect(result.current.features.createdBy).toBe(false);
    });

    it('keeps tags false when explicitly disabled even with tags service', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: { tags: false },
          services: { tags: mockTagsService },
        }),
      });

      expect(result.current.features.tags).toBe(false);
    });

    it('passes through an explicit FilterFeatureConfig for createdBy unchanged', () => {
      const customConfig = { getMetadata: jest.fn().mockResolvedValue([]) };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: { createdBy: customConfig },
          services: { userProfile: mockUserProfileService },
        }),
      });

      expect(result.current.features.createdBy).toBe(customConfig);
    });

    it('leaves createdBy undefined when no userProfile service is provided', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features: {} }),
      });

      expect(result.current.features.createdBy).toBeUndefined();
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

  describe('getMetadata applies params.filters (faceted-search semantics)', () => {
    const createTaggedItem = (
      id: string,
      tagIds: string[],
      createdBy?: string
    ): UserContentCommonSchema => ({
      id,
      type: 'dashboard',
      updatedAt: '2024-01-15T10:30:00.000Z',
      references: tagIds.map((tagId) => ({ type: 'tag', id: tagId, name: tagId })),
      attributes: { title: `Item ${id}`, description: '' },
      createdBy,
    });

    const mockTagsService = {
      getTagList: jest.fn().mockReturnValue([
        { id: 'tag-a', name: 'Alpha', description: '', color: '#f00', managed: false },
        { id: 'tag-b', name: 'Bravo', description: '', color: '#0f0', managed: false },
      ]),
      parseSearchQuery: jest.fn(),
    };

    const mockUserProfileService: UserProfileService = {
      getUserProfile: jest.fn(),
      bulkGetUserProfiles: jest.fn().mockImplementation(async (uids: string[]) =>
        uids.map((uid) => ({
          uid,
          enabled: true,
          user: { username: uid, full_name: uid, email: `${uid}@elastic.co` },
          data: {},
        }))
      ),
    };

    it('tag getMetadata narrows counts by active user filter', async () => {
      const items = [
        createTaggedItem('1', ['tag-a'], 'u_jane'),
        createTaggedItem('2', ['tag-a', 'tag-b'], 'u_bob'),
        createTaggedItem('3', ['tag-b'], 'u_jane'),
      ];
      const findItems = createMockFindItems(items);

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ findItems, services: { tags: mockTagsService } }),
      });

      // Prime the strategy cache by calling findItems.
      await act(async () => {
        await result.current.dataSource.findItems({
          searchQuery: '',
          filters: {},
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 20 },
        });
      });

      const tagsConfig = result.current.features.tags as FilterFeatureConfig;
      expect(tagsConfig.getMetadata).toBeDefined();

      // With user filter active for u_jane, only items 1 and 3 match.
      const facets = await tagsConfig.getMetadata({
        filters: { user: { include: ['u_jane'], exclude: [] } },
      });

      const tagA = facets.find((f: FilterFacet) => f.key === 'tag-a');
      const tagB = facets.find((f: FilterFacet) => f.key === 'tag-b');

      expect(tagA?.count).toBe(1);
      expect(tagB?.count).toBe(1);
    });

    it('createdBy getMetadata narrows counts by active tag filter', async () => {
      const items = [
        createTaggedItem('1', ['tag-a'], 'u_jane'),
        createTaggedItem('2', ['tag-a', 'tag-b'], 'u_bob'),
        createTaggedItem('3', ['tag-b'], 'u_jane'),
      ];
      const findItems = createMockFindItems(items);

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          findItems,
          services: { tags: mockTagsService, userProfile: mockUserProfileService },
        }),
      });

      await act(async () => {
        await result.current.dataSource.findItems({
          searchQuery: '',
          filters: {},
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 20 },
        });
      });

      const createdByConfig = result.current.features.createdBy as FilterFeatureConfig;
      expect(createdByConfig.getMetadata).toBeDefined();

      // With tag-a filter active, only items 1 and 2 match.
      const facets = await createdByConfig.getMetadata({
        filters: { [TAG_FILTER_ID]: { include: ['tag-a'], exclude: [] } },
      });

      const janeFacet = facets.find((f: FilterFacet) => f.key === 'u_jane');
      const bobFacet = facets.find((f: FilterFacet) => f.key === 'u_bob');

      expect(janeFacet?.count).toBe(1);
      expect(bobFacet?.count).toBe(1);
    });

    it('returns unfiltered counts when params.filters is empty', async () => {
      const items = [
        createTaggedItem('1', ['tag-a'], 'u_jane'),
        createTaggedItem('2', ['tag-a', 'tag-b'], 'u_bob'),
        createTaggedItem('3', ['tag-b'], 'u_jane'),
      ];
      const findItems = createMockFindItems(items);

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ findItems, services: { tags: mockTagsService } }),
      });

      await act(async () => {
        await result.current.dataSource.findItems({
          searchQuery: '',
          filters: {},
          sort: { field: 'title', direction: 'asc' },
          page: { index: 0, size: 20 },
        });
      });

      const tagsConfig = result.current.features.tags as FilterFeatureConfig;
      const facets = await tagsConfig.getMetadata({ filters: {} });

      const tagA = facets.find((f: FilterFacet) => f.key === 'tag-a');
      const tagB = facets.find((f: FilterFacet) => f.key === 'tag-b');

      expect(tagA?.count).toBe(2);
      expect(tagB?.count).toBe(2);
    });
  });
});
