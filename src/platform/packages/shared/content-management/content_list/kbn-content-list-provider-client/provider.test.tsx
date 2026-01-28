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
import { ContentListClientKibanaProvider } from './provider';

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
}));

// Mock the strategy to avoid any internal processing in tests.
jest.mock('./strategy', () => ({
  createFindItemsAdapter: jest.fn(({ findItems }) => ({
    findItems: jest.fn(async (params) => {
      // Call the consumer's findItems to allow verification.
      const result = await findItems(params.searchQuery, {});
      return { items: result.hits, total: result.total };
    }),
  })),
}));

import { ContentListProvider } from '@kbn/content-list-provider';
import { createFindItemsAdapter } from './strategy';

/**
 * Minimal mock services for testing. Only includes the properties we need.
 */
interface MockServices {
  core: {
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
    userProfile: { bulkGet: jest.fn().mockResolvedValue([]) },
  },
  savedObjectsTagging: {
    ui: { getTagList: jest.fn().mockReturnValue([]) },
  },
  favorites: {
    favoritesClient: { getFavorites: jest.fn().mockResolvedValue([]) },
  },
});

/**
 * Creates a mock findItems function for testing.
 */
const createMockFindItems = () =>
  jest.fn().mockResolvedValue({
    total: 0,
    hits: [],
  });

describe('ContentListClientKibanaProvider', () => {
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
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div data-test-subj="test-child">Test Content</div>
        </ContentListClientKibanaProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('creates findItems adapter with consumer findItems function', () => {
    const services = createMockServices();
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
      </QueryClientProvider>
    );

    expect(createFindItemsAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        findItems: mockFindItems,
        bulkGetUserProfiles: expect.any(Function),
      })
    );
  });

  it('passes entity props to ContentListProvider', () => {
    const services = createMockServices();
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="map"
          entityNamePlural="maps"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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

  it('passes dataSource with adapted findItems to ContentListProvider', () => {
    const services = createMockServices();
    const mockFindItems = createMockFindItems();
    const mockAdaptedFindItems = jest.fn().mockResolvedValue({ items: [], total: 0 });
    (createFindItemsAdapter as jest.Mock).mockReturnValue({ findItems: mockAdaptedFindItems });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
      </QueryClientProvider>
    );

    expect(ContentListProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSource: expect.objectContaining({
          findItems: mockAdaptedFindItems,
        }),
      }),
      expect.anything()
    );
  });

  it('builds services object with tags from savedObjectsTagging', () => {
    const services = createMockServices();
    const mockGetTagList = jest.fn().mockReturnValue([{ id: 'tag-1', name: 'Tag 1' }]);
    services.savedObjectsTagging.ui.getTagList = mockGetTagList;
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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
    const mockFindItems = createMockFindItems();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems}
          services={services as never}
          isReadOnly={true}
          queryKeyScope="my-scope"
          transform={mockTransform}
          features={{ search: { debounceMs: 500 } }}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
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

  it('re-creates adapter when findItems function changes', () => {
    const services = createMockServices();
    const mockFindItems1 = createMockFindItems();
    const mockFindItems2 = createMockFindItems();

    const { rerender } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems1}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
      </QueryClientProvider>
    );

    expect(createFindItemsAdapter).toHaveBeenCalledTimes(1);
    expect(createFindItemsAdapter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        findItems: mockFindItems1,
        bulkGetUserProfiles: expect.any(Function),
      })
    );

    // Re-render with different findItems function.
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ContentListClientKibanaProvider
          entityName="dashboard"
          entityNamePlural="dashboards"
          findItems={mockFindItems2}
          services={services as never}
        >
          <div>Content</div>
        </ContentListClientKibanaProvider>
      </QueryClientProvider>
    );

    expect(createFindItemsAdapter).toHaveBeenCalledTimes(2);
    expect(createFindItemsAdapter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        findItems: mockFindItems2,
        bulkGetUserProfiles: expect.any(Function),
      })
    );
  });
});
