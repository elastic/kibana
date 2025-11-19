/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useFilterDisplay } from './use_filter_display';
import {
  renderHookWithProvider,
  createMockFavoritesService,
  createMockUserProfileService,
} from '../../test_utils';

describe('useFilterDisplay', () => {
  it('should return all false when sorting is disabled', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        features: { sorting: false },
      },
    });

    expect(result.current).toEqual({
      hasFilters: false,
      hasSorting: false,
      hasTags: false,
      hasUsers: false,
      hasCustomFilters: false,
      hasStarred: false,
    });
  });

  it('should enable tags when tags service and config are available', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          tags: {
            getTagList: jest.fn(() => []),
          },
        },
        features: {
          tags: true,
          filtering: {
            tags: true,
          },
        },
      },
    });

    expect(result.current.hasTags).toBe(true);
    expect(result.current.hasSorting).toBe(true);
  });

  it('should disable tags when explicitly set to false in filtering config', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          tags: {
            getTagList: jest.fn(() => []),
          },
        },
        features: {
          tags: true,
          filtering: {
            tags: false,
          },
        },
      },
    });

    expect(result.current.hasTags).toBe(false);
  });

  it('should enable users when userProfiles service and config are available', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          userProfile: createMockUserProfileService(),
        },
        features: {
          userProfiles: true,
          filtering: {
            users: true,
          },
        },
      },
    });

    expect(result.current.hasUsers).toBe(true);
  });

  it('should disable users when explicitly set to false in filtering config', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          userProfile: createMockUserProfileService(),
        },
        features: {
          userProfiles: true,
          filtering: {
            users: false,
          },
        },
      },
    });

    expect(result.current.hasUsers).toBe(false);
  });

  it('should enable starred when favorites service and config are available', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          favorites: createMockFavoritesService(),
        },
        features: {
          starred: true,
          filtering: {
            starred: true,
          },
        },
      },
    });

    expect(result.current.hasStarred).toBe(true);
  });

  it('should disable starred when explicitly set to false in filtering config', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          favorites: createMockFavoritesService(),
        },
        features: {
          starred: true,
          filtering: {
            starred: false,
          },
        },
      },
    });

    expect(result.current.hasStarred).toBe(false);
  });

  it('should enable custom filters when custom filters are configured', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        features: {
          filtering: {
            custom: {
              status: {
                name: 'Status',
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
            },
          },
        },
      },
    });

    expect(result.current.hasCustomFilters).toBe(true);
  });

  it('should disable custom filters when no custom filters are configured', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        features: { filtering: {} },
      },
    });

    expect(result.current.hasCustomFilters).toBe(false);
  });

  it('should enable all filters when filtering is true shorthand', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          tags: {
            getTagList: jest.fn(() => []),
          },
          userProfile: createMockUserProfileService(),
          favorites: createMockFavoritesService(),
        },
        features: {
          tags: true,
          userProfiles: true,
          starred: true,
          filtering: true,
        },
      },
    });

    expect(result.current.hasTags).toBe(true);
    expect(result.current.hasUsers).toBe(true);
    expect(result.current.hasStarred).toBe(true);
  });

  it('should set hasFilters to true when any filter is enabled', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        services: {
          tags: {
            getTagList: jest.fn(() => []),
          },
        },
        features: {
          tags: true,
          filtering: {
            tags: true,
          },
        },
      },
    });

    expect(result.current.hasFilters).toBe(true);
  });

  it('should set hasFilters to true when only sorting is enabled', async () => {
    const { result } = await renderHookWithProvider(() => useFilterDisplay(), {
      providerOverrides: {
        features: { filtering: false },
      },
    });

    expect(result.current.hasSorting).toBe(true);
    expect(result.current.hasFilters).toBe(true);
  });
});
