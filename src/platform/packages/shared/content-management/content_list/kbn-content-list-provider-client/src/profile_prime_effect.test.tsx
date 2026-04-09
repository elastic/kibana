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
  UserProfileStore,
} from '@kbn/content-list-provider';
import {
  useContentListState,
  useQueryModel,
  useUserProfileStoreContext,
} from '@kbn/content-list-provider';
import { createPrimingState, primeRelevantProfiles } from './prime_relevant_profiles';
import { ProfilePrimeEffect } from './profile_prime_effect';

jest.mock('@kbn/content-list-provider', () => ({
  useContentListState: jest.fn(),
  useQueryModel: jest.fn(),
  useUserProfileStoreContext: jest.fn(),
}));

jest.mock('./prime_relevant_profiles', () => {
  const actual = jest.requireActual('./prime_relevant_profiles');
  return {
    ...actual,
    primeRelevantProfiles: jest.fn(),
  };
});

const mockedUseContentListState = jest.mocked(useContentListState);
const mockedUseQueryModel = jest.mocked(useQueryModel);
const mockedUseUserProfileStoreContext = jest.mocked(useUserProfileStoreContext);
const mockedPrimeRelevantProfiles = jest.mocked(primeRelevantProfiles);

const createMockStore = (): jest.Mocked<UserProfileStore> => ({
  getAll: jest.fn().mockReturnValue([]),
  resolve: jest.fn().mockReturnValue(undefined),
  ensureLoaded: jest.fn().mockResolvedValue(undefined),
  merge: jest.fn(),
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
    const store = createMockStore();
    const storeRef = { current: undefined as UserProfileStore | undefined };
    const primingState = createPrimingState();
    const allItems = createRawItems('1', '2');
    const getItems = jest.fn(() => allItems);
    const getDatasetVersion = jest.fn(() => 7);

    setMockContentListState('createdBy:jane', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseUserProfileStoreContext.mockReturnValue(store);
    mockedPrimeRelevantProfiles.mockResolvedValue(undefined);

    render(
      <ProfilePrimeEffect
        getItems={getItems}
        getDatasetVersion={getDatasetVersion}
        primingState={primingState}
        storeRef={storeRef}
      />
    );

    expect(storeRef.current).toBe(store);

    await waitFor(() => {
      expect(mockedPrimeRelevantProfiles).toHaveBeenCalledWith(allItems, 7, store, primingState);
    });
  });

  it('does not prime profiles for non-user queries', () => {
    const store = createMockStore();
    const storeRef = { current: undefined as UserProfileStore | undefined };
    const primingState = createPrimingState();

    setMockContentListState('tag:production', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['tag']));
    mockedUseUserProfileStoreContext.mockReturnValue(store);

    render(
      <ProfilePrimeEffect
        getItems={jest.fn(() => createRawItems('1'))}
        getDatasetVersion={jest.fn(() => 3)}
        primingState={primingState}
        storeRef={storeRef}
      />
    );

    expect(storeRef.current).toBe(store);
    expect(mockedPrimeRelevantProfiles).not.toHaveBeenCalled();
  });

  it('does not prime profiles until the cached item universe is populated', () => {
    const store = createMockStore();
    const storeRef = { current: undefined as UserProfileStore | undefined };
    const primingState = createPrimingState();

    setMockContentListState('createdBy:jane', createRenderedItems('visible-1'));
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy']));
    mockedUseUserProfileStoreContext.mockReturnValue(store);

    render(
      <ProfilePrimeEffect
        getItems={jest.fn(() => [])}
        getDatasetVersion={jest.fn(() => 3)}
        primingState={primingState}
        storeRef={storeRef}
      />
    );

    expect(storeRef.current).toBe(store);
    expect(mockedPrimeRelevantProfiles).not.toHaveBeenCalled();
  });

  it('re-primes after fetched items change while the user field clause remains active', async () => {
    const store = createMockStore();
    const storeRef = { current: undefined as UserProfileStore | undefined };
    const primingState = createPrimingState();

    let renderedItems = createRenderedItems('visible-1');
    let rawItems = createRawItems('1');
    let datasetVersion = 1;

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
    mockedUseUserProfileStoreContext.mockReturnValue(store);
    mockedPrimeRelevantProfiles.mockResolvedValue(undefined);

    const getItems = jest.fn(() => rawItems);
    const getDatasetVersion = jest.fn(() => datasetVersion);

    const { rerender } = render(
      <ProfilePrimeEffect
        getItems={getItems}
        getDatasetVersion={getDatasetVersion}
        primingState={primingState}
        storeRef={storeRef}
      />
    );

    await waitFor(() => {
      expect(mockedPrimeRelevantProfiles).toHaveBeenNthCalledWith(
        1,
        createRawItems('1'),
        1,
        store,
        primingState
      );
    });

    renderedItems = createRenderedItems('visible-1', 'visible-2');
    rawItems = createRawItems('1', '2');
    datasetVersion = 2;

    rerender(
      <ProfilePrimeEffect
        getItems={getItems}
        getDatasetVersion={getDatasetVersion}
        primingState={primingState}
        storeRef={storeRef}
      />
    );

    await waitFor(() => {
      expect(mockedPrimeRelevantProfiles).toHaveBeenNthCalledWith(
        2,
        createRawItems('1', '2'),
        2,
        store,
        primingState
      );
    });
  });

  it('skips priming when user field values are already resolved', () => {
    const store = createMockStore();
    const storeRef = { current: undefined as UserProfileStore | undefined };
    const primingState = createPrimingState();

    setMockContentListState('createdBy:jane@example.com', createRenderedItems('visible-1'));
    // No unresolved fields — the email resolved to a UID via the store.
    mockedUseQueryModel.mockReturnValue(createQueryModel(['createdBy'], []));
    mockedUseUserProfileStoreContext.mockReturnValue(store);

    render(
      <ProfilePrimeEffect
        getItems={jest.fn(() => createRawItems('1'))}
        getDatasetVersion={jest.fn(() => 3)}
        primingState={primingState}
        storeRef={storeRef}
      />
    );

    expect(storeRef.current).toBe(store);
    expect(mockedPrimeRelevantProfiles).not.toHaveBeenCalled();
  });
});
