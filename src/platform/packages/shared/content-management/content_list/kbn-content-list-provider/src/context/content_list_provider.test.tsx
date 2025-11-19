/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, render, act } from '@testing-library/react';
import { ContentListProvider, useContentListConfig } from './content_list_provider';
import type { ContentListItem } from '../item';
import {
  createMockFindItems,
  renderHookWithProvider,
  flushPromises,
  identityTransform,
  createMockFavoritesService,
  createMockUserProfileService,
} from '../test_utils';

describe('ContentListProvider', () => {
  describe('Provider rendering', () => {
    it('should render children', async () => {
      let container: HTMLElement;
      await act(async () => {
        const rendered = render(
          <ContentListProvider
            entityName="test"
            entityNamePlural="tests"
            dataSource={{ findItems: createMockFindItems(), transform: identityTransform }}
            services={{}}
          >
            <div data-test-subj="test-child">Test Content</div>
          </ContentListProvider>
        );
        container = rendered.container;
        await flushPromises();
      });

      expect(container!.querySelector('[data-test-subj="test-child"]')).toBeInTheDocument();
    });

    it('should render multiple children', async () => {
      let container: HTMLElement;
      await act(async () => {
        const rendered = render(
          <ContentListProvider
            entityName="test"
            entityNamePlural="tests"
            dataSource={{ findItems: createMockFindItems(), transform: identityTransform }}
            services={{}}
          >
            <div data-test-subj="child-1">Child 1</div>
            <div data-test-subj="child-2">Child 2</div>
          </ContentListProvider>
        );
        container = rendered.container;
        await flushPromises();
      });

      expect(container!.querySelector('[data-test-subj="child-1"]')).toBeInTheDocument();
      expect(container!.querySelector('[data-test-subj="child-2"]')).toBeInTheDocument();
    });
  });

  describe('Context provisioning', () => {
    it('should throw error when hooks used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListConfig());
      }).toThrow('ContentListContext is missing');

      consoleError.mockRestore();
    });

    it('should provide configuration through context', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          entityName: 'dashboard',
          entityNamePlural: 'dashboards',
          isReadOnly: true,
        },
      });

      expect(result.current.entityName).toBe('dashboard');
      expect(result.current.entityNamePlural).toBe('dashboards');
      expect(result.current.isReadOnly).toBe(true);
    });

    it('should pass dataSource through context', async () => {
      const mockFindItems = createMockFindItems();
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      expect(result.current.dataSource.findItems).toBe(mockFindItems);
    });

    it('should pass item config through context', async () => {
      const itemConfig = {
        getHref: (item: ContentListItem) => `#/item/${item.id}`,
        actions: {
          onEdit: jest.fn(),
          onDelete: jest.fn(),
        },
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          item: itemConfig,
        },
      });

      expect(result.current.item).toBe(itemConfig);
    });

    it('should pass selection actions through context', async () => {
      const selectionActions = {
        onSelectionDelete: jest.fn(),
        onSelectionExport: jest.fn(),
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          features: { selection: selectionActions },
        },
      });

      expect(result.current.features.selection).toBe(selectionActions);
    });

    it('should pass global actions through context', async () => {
      const globalActions = {
        onCreate: jest.fn(),
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          features: { globalActions },
        },
      });

      expect(result.current.features.globalActions).toBe(globalActions);
    });
  });

  describe('Feature configuration', () => {
    it('should pass search config through context', async () => {
      const searchConfig = {
        initialQuery: 'test query',
        placeholder: 'Search...',
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          features: { search: searchConfig },
        },
      });

      expect(result.current.features.search).toEqual(searchConfig);
    });

    it('should pass sorting config through context', async () => {
      const sortingConfig = {
        initialSort: { field: 'updatedAt', direction: 'desc' as const },
        options: [
          { label: 'Name A-Z', field: 'title', direction: 'asc' as const },
          { label: 'Name Z-A', field: 'title', direction: 'desc' as const },
          { label: 'Recently updated', field: 'updatedAt', direction: 'desc' as const },
          { label: 'Least recently updated', field: 'updatedAt', direction: 'asc' as const },
        ],
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          features: { sorting: sortingConfig },
        },
      });

      expect(result.current.features.sorting).toEqual(sortingConfig);
    });

    it('should pass pagination config through context', async () => {
      const paginationConfig = {
        initialPageSize: 50,
        pageSizeOptions: [10, 25, 50, 100],
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          features: { pagination: paginationConfig },
        },
      });

      expect(result.current.features.pagination).toEqual(paginationConfig);
    });

    it('should pass filtering config through context', async () => {
      const filteringConfig = {
        tags: true,
        users: true,
        favorites: false,
      };

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          features: { filtering: filteringConfig },
        },
      });

      expect(result.current.features.filtering).toEqual(filteringConfig);
    });
  });

  describe('Read-only mode', () => {
    it('should default isReadOnly to false', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig());

      expect(result.current.isReadOnly).toBeFalsy();
    });

    it('should respect isReadOnly prop', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          isReadOnly: true,
        },
      });

      expect(result.current.isReadOnly).toBe(true);
    });
  });

  describe('parseSearchQuery generation', () => {
    it('should enable tags support when tags service is provided', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Important', color: '#FF0000', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);

      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      // parseSearchQuery is not exposed in the context, but tags support should be enabled.
      expect(result.current.supports.tags).toBe(true);
    });

    it('should not enable tags support when tags service is not provided', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {},
        },
      });

      expect(result.current.supports.tags).toBe(false);
    });
  });

  describe('Feature support flags', () => {
    it('should set supports.tags to true when tags service is provided', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            tags: {
              getTagList: jest.fn(() => []),
            },
          },
        },
      });

      expect(result.current.supports.tags).toBe(true);
    });

    it('should set supports.tags to false when tags service is missing', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {},
        },
      });

      expect(result.current.supports.tags).toBe(false);
    });

    it('should set supports.tags to false when tags is explicitly disabled', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            tags: {
              getTagList: jest.fn(() => []),
            },
          },
          features: {
            tags: false,
          },
        },
      });

      expect(result.current.supports.tags).toBe(false);
    });

    it('should set supports.starred to true when favorites service is provided', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            favorites: createMockFavoritesService(),
          },
        },
      });

      expect(result.current.supports.starred).toBe(true);
    });

    it('should set supports.starred to false when favorites service is missing', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {},
        },
      });

      expect(result.current.supports.starred).toBe(false);
    });

    it('should set supports.starred to false when starred feature is explicitly disabled', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            favorites: createMockFavoritesService(),
          },
          features: {
            starred: false,
          },
        },
      });

      expect(result.current.supports.starred).toBe(false);
    });

    it('should set supports.userProfiles to true when userProfile service is provided', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            userProfile: createMockUserProfileService(),
          },
        },
      });

      expect(result.current.supports.userProfiles).toBe(true);
    });

    it('should set supports.userProfiles to false when userProfile service is missing', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {},
        },
      });

      expect(result.current.supports.userProfiles).toBe(false);
    });

    it('should set supports.userProfiles to false when userProfiles is explicitly disabled', async () => {
      const { result } = await renderHookWithProvider(() => useContentListConfig(), {
        providerOverrides: {
          services: {
            userProfile: createMockUserProfileService(),
          },
          features: {
            userProfiles: false,
          },
        },
      });

      expect(result.current.supports.userProfiles).toBe(false);
    });
  });
});

// NOTE: The Kibana providers (ContentListClientKibanaProvider and ContentListServerKibanaProvider)
// require savedObjectType and an HTTP client. Feature support tests for tags, favorites, and
// userProfiles are covered in the ContentListProvider tests above since the feature detection
// logic is identical - it's based on service presence and feature flags, not the provider type.
