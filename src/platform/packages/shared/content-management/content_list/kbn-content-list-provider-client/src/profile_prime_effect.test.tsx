/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentListItem,
  ContentListQueryModel,
  ProfileCache,
} from '@kbn/content-list-provider';
import { useContentListState, useQueryModel, useProfileCache } from '@kbn/content-list-provider';
import { ProfilePrimeEffect } from './profile_prime_effect';

jest.mock('@kbn/content-list-provider', () => {
  const MANAGED = '__managed__';
  const NO_CREATOR = '__no_creator__';
  return {
    useContentListState: jest.fn(),
    useQueryModel: jest.fn(),
    useProfileCache: jest.fn(),
    MANAGED_USER_FILTER: MANAGED,
    NO_CREATOR_USER_FILTER: NO_CREATOR,
    SENTINEL_KEYS: new Set([MANAGED, NO_CREATOR]),
    getCreatorKey: (item: { managed?: boolean; createdBy?: string }) => {
      if (item.managed) {
        return MANAGED;
      }
      return item.createdBy ?? NO_CREATOR;
    },
  };
});

const mockedUseContentListState = jest.mocked(useContentListState);
const mockedUseQueryModel = jest.mocked(useQueryModel);
const mockedUseProfileCache = jest.mocked(useProfileCache);

const createMockCache = (): jest.Mocked<
  Pick<
    ProfileCache,
    'resolve' | 'getAll' | 'ensureLoaded' | 'loadOne' | 'subscribe' | 'getSnapshot'
  >
> => ({
  resolve: jest.fn().mockReturnValue(undefined),
  getAll: jest.fn().mockReturnValue([]),
  ensureLoaded: jest.fn().mockResolvedValue(undefined),
  loadOne: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockReturnValue(() => {}),
  getSnapshot: jest.fn().mockReturnValue(0),
});

const createRenderedItems = (...ids: string[]): ContentListItem[] =>
  ids.map((id) => ({
    id,
    title: `Visible item ${id}`,
  }));

const createRawItems = (...ids: string[]): UserContentCommonSchema[] =>
  ids.map((id) => ({
    id,
    type: 'dashboard',
    updatedAt: '2024-01-01T00:00:00.000Z',
    references: [],
    attributes: { title: `Item ${id}` },
    createdBy: `user-${id}`,
  }));

const createQueryModel = (
  referencedFields: string[],
  unresolvedFields?: string[]
): ContentListQueryModel => ({
  search: '',
  filters: {},
  flags: {},
  referencedFields: new Set(referencedFields),
  unresolvedFields: new Set(unresolvedFields ?? referencedFields),
});

const setMockContentListState = (queryText: string, items: ContentListItem[]) => {
  mockedUseContentListState.mockReturnValue({
    state: {
      queryText,
      items,
      totalItems: items.length,
      isLoading: false,
      isFetching: false,
      error: undefined,
      sort: { field: 'updatedAt', direction: 'desc' },
      page: { index: 0, size: 25 },
      selection: { selectedIds: [] },
    },
    dispatch: jest.fn(),
    refetch: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
  });
};

describe('ProfilePrimeEffect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('primes profiles when the query model references createdBy', async () => {
    const cache = createMockCache();
    const allItems = createRawItems('1', '2');
    const getItems = jest.fn(() => allItems);

    setMockContentListState('createdBy:jane', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseProfileCache.mockReturnValue(cache as unknown as ProfileCache);

    render(<ProfilePrimeEffect getItems={getItems} />);

    await waitFor(() => {
      expect(cache.ensureLoaded).toHaveBeenCalledWith(['user-1', 'user-2']);
    });
  });

  it('does not prime profiles for non-user queries', () => {
    const cache = createMockCache();

    setMockContentListState('tag:production', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['tag']));
    mockedUseProfileCache.mockReturnValue(cache as unknown as ProfileCache);

    render(<ProfilePrimeEffect getItems={jest.fn(() => createRawItems('1'))} />);

    expect(cache.ensureLoaded).not.toHaveBeenCalled();
  });

  it('does not prime profiles until the cached item universe is populated', () => {
    const cache = createMockCache();

    setMockContentListState('createdBy:jane', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseProfileCache.mockReturnValue(cache as unknown as ProfileCache);

    render(<ProfilePrimeEffect getItems={jest.fn(() => [])} />);

    expect(cache.ensureLoaded).not.toHaveBeenCalled();
  });

  it('re-primes after fetched items change while the user field clause remains active', async () => {
    const cache = createMockCache();

    let renderedItems = createRenderedItems('visible-1');
    let rawItems = createRawItems('1');

    mockedUseContentListState.mockImplementation(() => ({
      state: {
        queryText: 'createdBy:jane',
        items: renderedItems,
        totalItems: renderedItems.length,
        isLoading: false,
        isFetching: false,
        error: undefined,
        sort: { field: 'updatedAt', direction: 'desc' as const },
        page: { index: 0, size: 25 },
        selection: { selectedIds: [] },
      },
      dispatch: jest.fn(),
      refetch: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    }));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseProfileCache.mockReturnValue(cache as unknown as ProfileCache);

    const getItems = jest.fn(() => rawItems);

    const { rerender } = render(<ProfilePrimeEffect getItems={getItems} />);

    await waitFor(() => {
      expect(cache.ensureLoaded).toHaveBeenNthCalledWith(1, ['user-1']);
    });

    renderedItems = createRenderedItems('visible-1', 'visible-2');
    rawItems = createRawItems('1', '2');

    rerender(<ProfilePrimeEffect getItems={getItems} />);

    await waitFor(() => {
      expect(cache.ensureLoaded).toHaveBeenNthCalledWith(2, ['user-1', 'user-2']);
    });
  });

  it('skips priming when user field values are already resolved', () => {
    const cache = createMockCache();

    setMockContentListState('createdBy:jane@example.com', createRenderedItems('visible-1'));
    // No unresolved fields -- the email resolved to a UID via the cache.
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy'], []));
    mockedUseProfileCache.mockReturnValue(cache as unknown as ProfileCache);

    render(<ProfilePrimeEffect getItems={jest.fn(() => createRawItems('1'))} />);

    expect(cache.ensureLoaded).not.toHaveBeenCalled();
  });

  it('does not prime when cache is undefined', () => {
    setMockContentListState('createdBy:jane', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseProfileCache.mockReturnValue(undefined);

    render(<ProfilePrimeEffect getItems={jest.fn(() => createRawItems('1'))} />);

    // No error thrown, no ensureLoaded called -- cache is undefined.
  });

  it('excludes sentinel keys from priming', async () => {
    const cache = createMockCache();
    const allItems: UserContentCommonSchema[] = [
      ...createRawItems('1'),
      {
        id: 'managed-item',
        type: 'dashboard',
        updatedAt: '2024-01-01T00:00:00.000Z',
        references: [],
        attributes: { title: 'Managed item' },
        managed: true,
        createdBy: 'some-user',
      },
      {
        id: 'no-creator-item',
        type: 'dashboard',
        updatedAt: '2024-01-01T00:00:00.000Z',
        references: [],
        attributes: { title: 'No creator item' },
        // No createdBy -- getCreatorKey returns NO_CREATOR_USER_FILTER
      },
    ];
    const getItems = jest.fn(() => allItems);

    setMockContentListState('createdBy:jane', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseProfileCache.mockReturnValue(cache as unknown as ProfileCache);

    render(<ProfilePrimeEffect getItems={getItems} />);

    await waitFor(() => {
      expect(cache.ensureLoaded).toHaveBeenCalledWith(['user-1']);
    });
  });
});
