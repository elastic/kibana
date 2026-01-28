/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ContentListServerKibanaProvider } from './provider';

// Mock the ContentListProvider to verify props passed to it.
jest.mock('@kbn/content-list-provider', () => ({
  ContentListProvider: jest.fn(({ children }) => (
    <div data-test-subj="mock-provider">{children}</div>
  )),
  createUserProfileAdapter: jest.fn((userProfile) => ({
    bulkGetUserProfiles: jest.fn((uids: string[]) =>
      uids.length === 0
        ? Promise.resolve([])
        : userProfile.bulkGet({ uids: new Set(uids), dataPath: 'avatar' })
    ),
    getUserProfile: jest.fn(async (uid: string) => {
      const profiles = await userProfile.bulkGet({ uids: new Set([uid]), dataPath: 'avatar' });
      return profiles[0];
    }),
  })),
  SERVER_SEARCH_DEBOUNCE_MS: 300,
}));

// Mock the strategy to avoid HTTP calls.
jest.mock('./strategy', () => ({
  createSearchItemsStrategy: jest.fn(() => ({
    findItems: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  })),
}));

import { ContentListProvider } from '@kbn/content-list-provider';
import { createSearchItemsStrategy } from './strategy';

/**
 * Minimal mock services for testing. Only includes the properties we need.
 */
interface MockServices {
  core: {
    http: { post: jest.Mock };
    userProfile: { bulkGet: jest.Mock };
  };
  savedObjectsTagging: {
    ui: { getTagList: jest.Mock };
  };
  favorites: {
    favoritesClient: { getFavorites: jest.Mock };
  };
}

/**
 * Creates mock services with only the methods we need for testing.
 */
const createMockServices = (): MockServices => ({
  core: {
    http: { post: jest.fn() },
    userProfile: { bulkGet: jest.fn().mockResolvedValue([]) },
  },
  savedObjectsTagging: {
    ui: { getTagList: jest.fn().mockReturnValue([]) },
  },
  favorites: {
    favoritesClient: { getFavorites: jest.fn().mockResolvedValue([]) },
  },
});

describe('ContentListServerKibanaProvider', () => {
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children within the provider', () => {
    const services = createMockServices();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div data-test-subj="test-child">Test Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('creates searchItems strategy with correct options', () => {
    const services = createMockServices();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          searchFieldsConfig={{ additionalAttributes: ['status'] }}
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(createSearchItemsStrategy).toHaveBeenCalledWith({
      savedObjectType: 'map',
      http: services.core.http,
      searchFieldsConfig: { additionalAttributes: ['status'] },
    });
  });

  it('supports multiple saved object types', () => {
    const services = createMockServices();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="content"
          entityNamePlural="contents"
          savedObjectType={['map', 'dashboard']}
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(createSearchItemsStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectType: ['map', 'dashboard'],
      })
    );
  });

  it('passes entity props to ContentListProvider', () => {
    const services = createMockServices();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(ContentListProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'map',
        entityNamePlural: 'maps',
      }),
      expect.anything()
    );
  });

  it('passes dataSource with findItems and debounceMs to ContentListProvider', () => {
    const services = createMockServices();
    const mockFindItems = jest.fn().mockResolvedValue({ items: [], total: 0 });
    (createSearchItemsStrategy as jest.Mock).mockReturnValue({ findItems: mockFindItems });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(ContentListProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSource: expect.objectContaining({
          findItems: mockFindItems,
          debounceMs: 300,
        }),
      }),
      expect.anything()
    );
  });

  it('builds services object with tags from savedObjectsTagging', () => {
    const services = createMockServices();
    const mockGetTagList = jest.fn().mockReturnValue([{ id: 'tag-1', name: 'Tag 1' }]);
    services.savedObjectsTagging.ui.getTagList = mockGetTagList;

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(ContentListProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        services: expect.objectContaining({
          tags: {
            getTagList: mockGetTagList,
          },
        }),
      }),
      expect.anything()
    );
  });

  it('builds userProfile service that wraps core userProfile.bulkGet', async () => {
    const services = createMockServices();
    const mockProfiles = [
      { uid: 'user-1', user: { username: 'user1' } },
      { uid: 'user-2', user: { username: 'user2' } },
    ];
    services.core.userProfile.bulkGet = jest.fn().mockResolvedValue(mockProfiles);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    // Extract the services passed to ContentListProvider.
    const { services: passedServices } = (ContentListProvider as jest.Mock).mock.calls[0][0];

    // Test bulkGetUserProfiles.
    const profiles = await passedServices.userProfile.bulkGetUserProfiles(['user-1', 'user-2']);
    expect(services.core.userProfile.bulkGet).toHaveBeenCalledWith({
      uids: new Set(['user-1', 'user-2']),
      dataPath: 'avatar',
    });
    expect(profiles).toEqual(mockProfiles);
  });

  it('returns empty array from bulkGetUserProfiles when uids is empty', async () => {
    const services = createMockServices();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    const { services: passedServices } = (ContentListProvider as jest.Mock).mock.calls[0][0];

    const profiles = await passedServices.userProfile.bulkGetUserProfiles([]);
    expect(profiles).toEqual([]);
    expect(services.core.userProfile.bulkGet).not.toHaveBeenCalled();
  });

  it('provides getUserProfile that fetches single profile', async () => {
    const services = createMockServices();
    const mockProfile = { uid: 'user-1', user: { username: 'user1' } };
    services.core.userProfile.bulkGet = jest.fn().mockResolvedValue([mockProfile]);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    const { services: passedServices } = (ContentListProvider as jest.Mock).mock.calls[0][0];

    const profile = await passedServices.userProfile.getUserProfile('user-1');
    expect(services.core.userProfile.bulkGet).toHaveBeenCalledWith({
      uids: new Set(['user-1']),
      dataPath: 'avatar',
    });
    expect(profile).toEqual(mockProfile);
  });

  it('passes favorites service through to ContentListProvider', () => {
    const services = createMockServices();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(ContentListProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        services: expect.objectContaining({
          favorites: services.favorites,
        }),
      }),
      expect.anything()
    );
  });

  it('passes optional props to ContentListProvider', () => {
    const services = createMockServices();
    const mockTransform = jest.fn((item) => item);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListServerKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          savedObjectType="map"
          services={services as never}
          isReadOnly={true}
          queryKeyScope="my-scope"
          transform={mockTransform}
          features={{ search: { debounceMs: 500 } }}
        >
          <div>Content</div>
        </ContentListServerKibanaProvider>
      </QueryClientProvider>
    );

    expect(ContentListProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        isReadOnly: true,
        queryKeyScope: 'my-scope',
        features: { search: { debounceMs: 500 } },
      }),
      expect.anything()
    );
  });
});
