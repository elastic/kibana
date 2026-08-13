/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import {
  useOpenContentEditor,
  type OpenContentEditorParams,
} from '@kbn/content-management-content-editor';
import {
  CREATED_BY_FILTER_ID,
  type FindItemsParams,
  TAG_FILTER_ID,
  useContentListConfig,
} from '@kbn/content-list-provider';
import { ContentListClientProvider } from './provider';
import type { ContentListClientProviderProps } from './provider';
import { defineContentListFilter } from './filters';
import type {
  TableListViewFindItemsFn,
  ContentListClientServices,
  ContentListKibanaCore,
} from './types';

// Stub out the Kibana platform wiring; tests override `useOpenContentEditor`
// per-case to observe the `open` path end-to-end.
jest.mock('@kbn/content-management-content-editor', () => {
  const ReactModule = jest.requireActual('react') as typeof React;
  return {
    ContentEditorKibanaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    useOpenContentEditor: jest.fn(() => jest.fn()),
  };
});

const mockUseOpenContentEditor = useOpenContentEditor as jest.Mock;

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

  // Only `uiSettings.get` is read; the Content Editor surface goes through the mocked provider.
  const createMockCore = (pageSize = 20): ContentListKibanaCore =>
    ({
      uiSettings: { get: jest.fn(() => pageSize) },
    } as unknown as ContentListKibanaCore);

  const createMockServices = (): ContentListClientServices => ({});

  const createContentTypeFilter = (queryField?: string) =>
    defineContentListFilter({
      id: 'contentType',
      ...(queryField ? { queryField } : {}),
      title: 'Content type',
      getItemValue: (item: UserContentCommonSchema) => item.type,
      options: [
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'visualization', label: 'Visualization' },
      ],
    });

  const findIds = async (
    dataSource: ReturnType<typeof useContentListConfig>['dataSource'],
    params: Pick<FindItemsParams, 'filters'> & Partial<Pick<FindItemsParams, 'sort'>>
  ) => {
    const response = await dataSource.findItems({
      searchQuery: '',
      filters: params.filters,
      sort: params.sort,
      page: { index: 0, size: 20 },
    });

    return response.items.map(({ id }) => id);
  };

  const createWrapper = (props?: Partial<ContentListClientProviderProps>) => {
    const defaultFindItems = createMockFindItems([createMockItem('1')]);
    const defaultProps: ContentListClientProviderProps = {
      id: 'test-client-list',
      labels: { entity: 'dashboard', entityPlural: 'dashboards' },
      findItems: defaultFindItems,
      core: createMockCore(),
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
        wrapper: createWrapper({ core: createMockCore(25) }),
      });

      expect(result.current.features).toMatchObject({
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

      expect(result.current.features).toMatchObject({
        ...features,
        pagination: { initialPageSize: 20 },
      });
    });

    it('preserves explicit initialPageSize over uiSettings value', () => {
      const features = {
        pagination: { initialPageSize: 50 },
      };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features, core: createMockCore(25) }),
      });

      expect(result.current.features).toMatchObject(features);
    });

    it('preserves pagination: false without re-enabling pagination', () => {
      const features = { pagination: false as const };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features, core: createMockCore(25) }),
      });

      expect(result.current.features.pagination).toBe(false);
      expect(result.current.supports.pagination).toBe(false);
    });

    it('registers and applies updater-defined custom filters', async () => {
      const findItems = createMockFindItems([
        createMockItem('1'),
        { ...createMockItem('2'), type: 'visualization' },
      ]);
      const typeFilter = createContentTypeFilter();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          findItems,
          features: {
            filters: (defaults) => ({ ...defaults, contentType: typeFilter }),
          },
        }),
      });

      // Registration wires the KQL field + client-side filtering, but does not
      // auto-render a toolbar control (placement is explicit via
      // `createFilterControl`).
      expect(result.current.features.fields).toEqual([
        expect.objectContaining({ fieldName: 'contentType' }),
      ]);
      await expect(
        findIds(result.current.dataSource, {
          filters: { contentType: { include: ['visualization'] } },
        })
      ).resolves.toEqual(['2']);
    });

    it('applies custom filters by query field when it differs from the filter id', async () => {
      const findItems = createMockFindItems([
        createMockItem('1'),
        { ...createMockItem('2'), type: 'visualization' },
      ]);
      const typeFilter = createContentTypeFilter('type');

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          findItems,
          features: {
            filters: {
              contentType: typeFilter,
            },
          },
        }),
      });

      expect(result.current.features.fields).toEqual([
        expect.objectContaining({ fieldName: 'type' }),
      ]);
      await expect(
        findIds(result.current.dataSource, {
          filters: { type: { include: ['visualization'] } },
        })
      ).resolves.toEqual(['2']);
    });

    it('registers and applies updater-defined custom sort fields', async () => {
      const findItems = createMockFindItems([createMockItem('1'), createMockItem('2')]);

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          findItems,
          features: {
            sorting: {
              fields: (defaults) => ({
                ...defaults,
                priority: {
                  id: 'priority',
                  title: 'Priority',
                  getValue: (item) => (item.id === '1' ? 2 : 1),
                },
              }),
            },
          },
        }),
      });

      expect(result.current.features.sorting).toMatchObject({
        fields: expect.arrayContaining([expect.objectContaining({ field: 'priority' })]),
      });
      await expect(
        findIds(result.current.dataSource, {
          filters: {},
          sort: { field: 'priority', direction: 'asc' },
        })
      ).resolves.toEqual(['2', '1']);
    });

    it('preserves default sort fields when custom sort fields are keyed', () => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: {
            sorting: {
              fields: {
                priority: { id: 'priority', title: 'Priority' },
              },
            },
          },
        }),
      });

      expect(result.current.features.sorting).toMatchObject({
        fields: expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
          expect.objectContaining({ field: 'updatedAt' }),
          expect.objectContaining({ field: 'priority' }),
        ]),
      });
    });

    it('applies built-in tag filters through shared filter dimensions', async () => {
      const taggedItem = {
        ...createMockItem('1'),
        references: [{ type: 'tag', id: 'tag-1', name: 'tag-1' }],
      };
      const untaggedItem = {
        ...createMockItem('2'),
        references: [{ type: 'tag', id: 'tag-2', name: 'tag-2' }],
      };
      const tags = {
        getTagList: () => [
          { id: 'tag-1', name: 'Production' },
          { id: 'tag-2', name: 'Development' },
        ],
      } as ContentListClientServices['tags'];

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          findItems: createMockFindItems([taggedItem, untaggedItem]),
          services: { tags },
        }),
      });

      await expect(
        findIds(result.current.dataSource, {
          filters: { [TAG_FILTER_ID]: { include: ['tag-1'] } },
        })
      ).resolves.toEqual(['1']);
    });

    it('applies built-in creator filters through shared filter dimensions', async () => {
      const janeItem = { ...createMockItem('1'), createdBy: 'u_jane' };
      const maxItem = { ...createMockItem('2'), createdBy: 'u_max' };

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          findItems: createMockFindItems([janeItem, maxItem]),
          services: {
            userProfiles: {
              bulkResolve: jest.fn().mockResolvedValue([]),
            },
          },
        }),
      });

      await expect(
        findIds(result.current.dataSource, {
          filters: { [CREATED_BY_FILTER_ID]: { include: ['u_jane'] } },
        })
      ).resolves.toEqual(['1']);
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
      const services = createMockServices();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ services }),
      });

      expect(result.current.services).toBe(services);
    });

    it('reads uiSettings values once at mount', () => {
      const core = createMockCore(15);

      const { rerender } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ core }),
      });

      rerender();
      rerender();

      // `core.uiSettings.get` should read each setting once at mount, order-independent.
      expect(core.uiSettings.get).toHaveBeenCalledTimes(2);
      expect(core.uiSettings.get).toHaveBeenCalledWith('savedObjects:listingLimit');
      expect(core.uiSettings.get).toHaveBeenCalledWith('savedObjects:perPage');
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
            services: { favorites: mockClient },
            features: { starred: false },
          }),
        });
      }).not.toThrow();
    });

    it('reports starred as unsupported when the feature is disabled', () => {
      const mockClient = createMockFavoritesClient();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          services: { favorites: mockClient },
          features: { starred: false },
        }),
      });

      expect(result.current.supports.starred).toBe(false);
    });

    it('reports starred as supported when favorites service is provided and feature is not disabled', () => {
      const mockClient = createMockFavoritesClient();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          services: { favorites: mockClient },
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

  describe('content editor wiring', () => {
    /** Returns the spy `useOpenContentEditor` will hand back on the next render. */
    const stubOpenContentEditor = () => {
      const openContentEditor = jest.fn<() => void, [OpenContentEditorParams]>(() => jest.fn());
      mockUseOpenContentEditor.mockReturnValue(openContentEditor);
      return openContentEditor;
    };

    /** Captures `features.contentEditor.open` from `useContentListConfig()`. */
    const captureOpen = (props?: Partial<ContentListClientProviderProps>) => {
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(props),
      });
      const open = result.current.features.contentEditor?.open;
      if (!open) {
        throw new Error(
          'expected provider to expose features.contentEditor.open when contentEditor is configured'
        );
      }
      return { open, dataSource: result.current.dataSource };
    };

    const captureFlyoutOnSave = (
      open: NonNullable<ReturnType<typeof captureOpen>['open']>,
      openContentEditor: jest.Mock<() => void, [OpenContentEditorParams]>
    ) => {
      act(() => {
        open({ id: '1', title: 'Item 1' });
      });
      const params = openContentEditor.mock.calls[0]?.[0];
      if (!params?.onSave) {
        throw new Error('expected the content editor path to provide an onSave callback');
      }
      return params.onSave;
    };

    it('omits `features.contentEditor.open` when no `contentEditor` config is supplied', () => {
      stubOpenContentEditor();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.features.contentEditor).toBeUndefined();
    });

    it('populates `features.contentEditor.open` when a `contentEditor` config is supplied', () => {
      stubOpenContentEditor();

      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({ features: { contentEditor: { isReadonly: true } } }),
      });

      expect(result.current.features.contentEditor?.open).toEqual(expect.any(Function));
    });

    it('does not touch `item.actions.inspect` (no per-item injection)', () => {
      // Regression: the old path injected onItemAction into item.actions.inspect.
      stubOpenContentEditor();

      const archiveOnItemAction = jest.fn();
      const { result } = renderHook(() => useContentListConfig(), {
        wrapper: createWrapper({
          features: { contentEditor: { isReadonly: true } },
          item: {
            actions: {
              archive: { onItemAction: archiveOnItemAction },
            },
          },
        }),
      });

      expect(result.current.item?.actions?.archive?.onItemAction).toBe(archiveOnItemAction);
    });

    // Regression: the strategy's `searchQuery`-keyed item cache wasn't reset
    // on save, so the post-save refetch returned stale rows.
    it('clears the strategy cache before the React Query invalidation runs', async () => {
      const findItems = createMockFindItems([createMockItem('1')]);
      const consumerOnSave = jest.fn(async () => {});
      const openContentEditor = stubOpenContentEditor();

      const { open, dataSource } = captureOpen({
        findItems,
        features: {
          contentEditor: {
            onSave: consumerOnSave,
            isReadonly: false,
          },
        },
      });

      const fetchParams = {
        searchQuery: 'foo',
        filters: {},
        sort: { field: 'title', direction: 'asc' as const },
        page: { index: 0, size: 20 },
      };

      // Prime the cache, then drop the priming calls (Strict Mode adds extras).
      await dataSource.findItems(fetchParams);
      findItems.mockClear();

      // Same `searchQuery` should now be a cache hit.
      await dataSource.findItems(fetchParams);
      expect(findItems).not.toHaveBeenCalled();

      const flyoutOnSave = captureFlyoutOnSave(open, openContentEditor);
      await act(async () => {
        await flyoutOnSave({ id: '1', title: 'Updated', tags: [] });
      });

      expect(consumerOnSave).toHaveBeenCalledWith({
        id: '1',
        title: 'Updated',
        tags: [],
      });

      // Same `searchQuery` should now miss because the wrapped `onSave` cleared the cache.
      await dataSource.findItems(fetchParams);
      expect(findItems).toHaveBeenCalled();
    });

    it('preserves the consumer onSave when contentEditor has no save handler', () => {
      const openContentEditor = stubOpenContentEditor();

      const { open } = captureOpen({
        features: {
          contentEditor: { isReadonly: true },
        },
      });

      act(() => {
        open({ id: '1', title: 'Item 1' });
      });

      // Read-only flyout: nothing to wrap, no synthesised handler.
      const params = openContentEditor.mock.calls[0]?.[0];
      expect(params?.onSave).toBeUndefined();
    });
  });
});
