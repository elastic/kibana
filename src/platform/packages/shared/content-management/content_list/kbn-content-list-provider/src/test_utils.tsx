/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  ContentListProvider,
  type ContentListProviderProps,
  type ContentListItem,
  type FindItemsParams,
  type FindItemsFn,
} from '.';

export interface RenderWithProvidersOptions {
  providerOverrides?: Partial<ContentListProviderProps>;
}

type ProviderDataSource = ContentListProviderProps['dataSource'];

/**
 * Tag IDs matching MOCK_TAGS from @kbn/content-list-mock-data.
 * Use these for consistent tag filtering in stories and tests.
 */
export const MOCK_TAG_IDS = {
  important: 'tag-important',
  production: 'tag-production',
  development: 'tag-development',
  archived: 'tag-archived',
  security: 'tag-security',
} as const;

/**
 * Create mock items for testing
 */
export function createMockItems(count: number = 5): ContentListItem[] {
  // Distribute tags using MOCK_TAGS-compatible IDs.
  const getTagsForIndex = (i: number): string[] => {
    const pattern = i % 4;
    switch (pattern) {
      case 0:
        return [MOCK_TAG_IDS.important, MOCK_TAG_IDS.production];
      case 1:
        return [];
      case 2:
        return [MOCK_TAG_IDS.production];
      case 3:
        return [MOCK_TAG_IDS.important];
      default:
        return [];
    }
  };

  return Array.from({ length: count }, (_, i) => {
    // Generate valid dates by adding days to a base date
    const baseDate = new Date('2024-01-01T00:00:00Z');
    const updatedDate = new Date(baseDate);
    updatedDate.setDate(baseDate.getDate() + i);

    return {
      id: `item-${i + 1}`,
      title: `Test Item ${i + 1}`,
      description: `Description for item ${i + 1}`,
      type: 'test-type',
      updatedAt: updatedDate,
      createdAt: baseDate,
      updatedBy: `user-${(i % 5) + 1}`,
      createdBy: 'user-1',
      tags: getTagsForIndex(i),
      references: [],
      favorite: (i + 1) % 3 === 0, // Every 3rd item is a favorite (items 3, 6, 9, etc.)
    };
  });
}

/**
 * Create mock UserContentCommonSchema items
 */
export function createMockUserContentItems(count: number = 5): UserContentCommonSchema[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    type: 'test-type',
    updatedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedBy: `user-${i + 1}`,
    createdBy: 'user-1',
    attributes: {
      title: `Test Item ${i + 1}`,
      description: `Description for item ${i + 1}`,
    },
    references: i % 2 === 0 ? [{ type: 'tag', id: 'tag-1', name: 'Tag 1' }] : [],
    namespaces: ['default'],
    version: `v${i + 1}`,
    managed: false,
  }));
}

/**
 * Create a mock findItems function that returns test data.
 * This mock implements the same interface as the real findItems but operates
 * on ContentListItem directly (post-transform format) for simpler test assertions.
 *
 * Note: The type cast is intentional - test mocks return ContentListItem directly
 * rather than the raw UserContentCommonSchema format. Tests pair this with
 * identityTransform to bypass transformation.
 */
export const createMockFindItems = (
  items: ContentListItem[] = createMockItems()
): FindItemsFn<UserContentCommonSchema> => {
  const mockFn = async ({ searchQuery, filters, sort, page }: FindItemsParams) => {
    let filteredItems = [...items];

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // Apply tag include filters
    if (filters.tags?.include && filters.tags.include.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        filters.tags?.include.some((tag) => item.tags?.includes(tag))
      );
    }

    // Apply tag exclude filters
    if (filters.tags?.exclude && filters.tags.exclude.length > 0) {
      filteredItems = filteredItems.filter(
        (item) => !filters.tags?.exclude.some((tag) => item.tags?.includes(tag))
      );
    }

    // Apply favorites filter
    if (filters.starredOnly) {
      filteredItems = filteredItems.filter(
        (item) => (item as ContentListItem & { favorite?: boolean }).favorite === true
      );
    }

    // Apply sorting
    filteredItems.sort((a, b) => {
      const aValue = a[sort.field as keyof ContentListItem];
      const bValue = b[sort.field as keyof ContentListItem];

      if (aValue === undefined || bValue === undefined) {
        return 0;
      }

      if (aValue === null || bValue === null) {
        return 0;
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const total = filteredItems.length;
    const start = page.index * page.size;
    const end = start + page.size;
    const paginatedItems = filteredItems.slice(start, end);

    return {
      items: paginatedItems,
      total,
    };
  };

  // Cast is intentional: test mocks return ContentListItem directly, paired with identityTransform
  return mockFn as unknown as ProviderDataSource['findItems'];
};

/**
 * Create a mock findItems function that simulates errors
 */
export function createErrorMockFindItems(
  errorMessage: string = 'Test error'
): FindItemsFn<UserContentCommonSchema> {
  return async () => {
    throw new Error(errorMessage);
  };
}

/**
 * Create a mock findItems function that simulates loading
 */
export function createLoadingMockFindItems(
  delay: number = 1000,
  items: ContentListItem[] = createMockItems()
): FindItemsFn<UserContentCommonSchema> {
  return async (params) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const mockFn = createMockFindItems(items);
    return mockFn(params);
  };
}

/**
 * Default transform function for tests (identity transform that passes items through unchanged)
 */
export const identityTransform = ((item: ContentListItem) => item) as unknown as NonNullable<
  ProviderDataSource['transform']
>;

/**
 * Default provider props for testing.
 * Note: `search.debounceMs` is set to 0 to disable debouncing in tests,
 * ensuring immediate state updates without timing issues.
 */
const defaultProviderProps: ContentListProviderProps = {
  entityName: 'item',
  entityNamePlural: 'items',
  dataSource: {
    findItems: createMockFindItems(),
    transform: identityTransform,
  },
  services: {},
  features: {
    search: { debounceMs: 0 },
    filtering: true,
  },
};

/**
 * Build provider props with overrides.
 *
 * Note: Always uses identityTransform unless explicitly overridden, since test mocks
 * return ContentListItem format directly (not raw API format).
 */
const buildProviderProps = (
  overrides?: Partial<ContentListProviderProps>
): ContentListProviderProps => {
  if (!overrides) {
    return {
      ...defaultProviderProps,
      dataSource: { ...defaultProviderProps.dataSource },
      features: { ...defaultProviderProps.features },
    };
  }

  // Always ensure transform is set - tests use mock data that's already in ContentListItem format.
  const dataSource = {
    ...defaultProviderProps.dataSource,
    ...overrides.dataSource,
    // Use identity transform unless explicitly overridden.
    transform: overrides.dataSource?.transform ?? identityTransform,
  };

  // Merge features.
  const features = {
    ...defaultProviderProps.features,
    ...overrides.features,
  };

  return {
    ...defaultProviderProps,
    ...overrides,
    dataSource,
    features,
  };
};

/**
 * Flush promises to allow async operations to complete
 */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Render with ContentListProvider wrapper
 * Uses renderWithKibanaRenderContext from @kbn/test-jest-helpers for I18n/EUI providers
 */
export async function renderWithProvider(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions & { queryClient?: QueryClient } = {}
) {
  const { providerOverrides, queryClient } = options;
  const providerProps = buildProviderProps(providerOverrides);
  const client = queryClient ?? createTestQueryClient();

  let renderResult: ReturnType<typeof renderWithKibanaRenderContext> | undefined;

  await act(async () => {
    renderResult = renderWithKibanaRenderContext(
      <QueryClientProvider client={client}>
        <ContentListProvider {...providerProps}>{ui}</ContentListProvider>
      </QueryClientProvider>
    );
  });

  // Wait for React Query to settle
  await act(async () => {
    await flushPromises();
  });

  return renderResult!;
}

/**
 * Create a QueryClient for testing with default options
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests for faster feedback
        retry: false,
        // Disable cache time to ensure fresh data in each test
        cacheTime: 0,
        // Disable stale time for immediate refetches
        staleTime: 0,
      },
    },
    // Silence query errors in tests (they're expected in error tests)
    logger: {
      // eslint-disable-next-line no-console
      log: console.log,
      // eslint-disable-next-line no-console
      warn: console.warn,
      error: () => {},
    },
  });
}

/**
 * Create a wrapper component for renderHook tests
 * Note: i18n is already initialized by Jest setup (mocks.kbn_i18n_react.js)
 */
export function createProviderWrapper(
  providerOverrides?: Partial<ContentListProviderProps>,
  queryClient?: QueryClient
) {
  const providerProps = buildProviderProps(providerOverrides);
  const client = queryClient ?? createTestQueryClient();

  return ({ children }: PropsWithChildren<unknown>) => (
    <QueryClientProvider client={client}>
      <ContentListProvider {...providerProps}>{children}</ContentListProvider>
    </QueryClientProvider>
  );
}

/**
 * Render a hook with the ContentListProvider wrapper and wait for data to load.
 * Uses React Query for data fetching.
 */
export async function renderHookWithProvider<Result, Props>(
  hook: (props: Props) => Result,
  options: {
    providerOverrides?: Partial<ContentListProviderProps>;
    initialProps?: Props;
    /** Custom QueryClient for test isolation */
    queryClient?: QueryClient;
  } = {}
) {
  const { providerOverrides, initialProps, queryClient } = options;
  const wrapper = createProviderWrapper(providerOverrides, queryClient);

  const result = renderHook(hook, { wrapper, initialProps });

  // Wait for React Query to settle by flushing promises
  // This allows the query to complete its fetch cycle
  await act(async () => {
    await flushPromises();
  });

  return result;
}

/**
 * Mock data constants
 */
export const MOCK_ITEMS = createMockItems(10);
export const MOCK_USER_CONTENT_ITEMS = createMockUserContentItems(10);

/**
 * Create a properly configured mock favorites service.
 * Returns valid data to avoid React Query "undefined data" errors.
 */
export const createMockFavoritesService = () => ({
  favoritesClient: {
    getFavorites: jest.fn().mockResolvedValue([]),
    addFavorite: jest.fn().mockResolvedValue(undefined),
    removeFavorite: jest.fn().mockResolvedValue(undefined),
    getFavoriteType: jest.fn().mockReturnValue('test-type'),
    reportAddFavoriteClick: jest.fn(),
    reportRemoveFavoriteClick: jest.fn(),
    isAvailable: jest.fn().mockResolvedValue(true),
  },
});

/**
 * Create a properly configured mock user profile service.
 * Returns valid data to avoid React Query "undefined data" errors.
 */
export const createMockUserProfileService = () => ({
  getUserProfile: jest.fn().mockResolvedValue(null),
  bulkGetUserProfiles: jest.fn().mockResolvedValue([]),
});
