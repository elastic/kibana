/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { ContentListItem, ContentListProviderProps } from '@kbn/content-list';
import {
  MOCK_DASHBOARDS,
  createMockFavoritesClient,
  mockContentListUserProfilesServices,
  mockTagsService,
} from '@kbn/content-list-mock-data';
import {
  createMockStoryFindItems,
  createMockTagFacetProvider,
  createMockUserProfileFacetProvider,
} from '../../stories_helpers';

export const dashboardLabels = {
  entity: 'dashboard',
  entityPlural: 'dashboards',
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type DashboardExampleProviderProps = Pick<
  ContentListProviderProps,
  'dataSource' | 'features' | 'item' | 'services'
>;

export const useDashboardExampleProviderProps = ({
  isEmpty = false,
  includeSavedObjectServices = false,
}: {
  isEmpty?: boolean;
  includeSavedObjectServices?: boolean;
} = {}): DashboardExampleProviderProps => {
  const favoritesClient = useMemo(
    () => createMockFavoritesClient(['dashboard-001', 'dashboard-003']),
    []
  );

  const dataSource = useMemo(
    () => ({
      debounceMs: 0,
      findItems: isEmpty
        ? async () => ({ items: [], total: 0 })
        : createMockStoryFindItems({ items: MOCK_DASHBOARDS, favoritesClient }),
    }),
    [favoritesClient, isEmpty]
  );

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: 'updatedAt', direction: 'desc' as const },
        fields: [
          { field: 'title', name: 'Name' },
          { field: 'updatedAt', name: 'Last updated' },
        ],
      },
      pagination: { initialPageSize: 10 },
      ...(includeSavedObjectServices
        ? {
            tags: createMockTagFacetProvider(MOCK_DASHBOARDS),
            starred: true as const,
            userProfiles: createMockUserProfileFacetProvider(MOCK_DASHBOARDS),
          }
        : {}),
    }),
    [includeSavedObjectServices]
  );

  const item = useMemo(
    () => ({
      getHref: (content: ContentListItem) => `#/dashboard/${content.id}`,
      getEditUrl: (content: ContentListItem) => `#/dashboard/${content.id}?view=edit`,
      onDelete: async () => {
        await wait(200);
      },
    }),
    []
  );

  return {
    dataSource,
    features,
    item,
    services: includeSavedObjectServices
      ? {
          favorites: favoritesClient,
          tags: mockTagsService,
          userProfiles: mockContentListUserProfilesServices,
        }
      : undefined,
  };
};
