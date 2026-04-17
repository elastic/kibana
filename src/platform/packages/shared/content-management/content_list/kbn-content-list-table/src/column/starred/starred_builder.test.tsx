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
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import {
  ContentListProvider,
  type ContentListItem,
  type ContentListSupports,
  type FindItemsParams,
  type FindItemsResult,
} from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildStarredColumn, type StarredColumnProps } from './starred_builder';

jest.mock('@kbn/content-management-favorites-public', () => {
  const actual = jest.requireActual('@kbn/content-management-favorites-public');

  return {
    ...actual,
    FavoriteButton: ({ id }: { id: string }) => (
      <button data-test-subj="mock-favorite-button" data-id={id}>
        favorite
      </button>
    ),
  };
});

type StarredColumn = EuiTableFieldDataColumnType<ContentListItem>;

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockFavoritesService: FavoritesClientPublic = {
  getFavorites: async () => ({ favoriteIds: [], favoriteMetadata: {} as Record<string, never> }),
  addFavorite: async ({ id }: { id: string }) => ({ favoriteIds: [id] }),
  removeFavorite: async () => ({ favoriteIds: [] }),
  isAvailable: async () => true,
  getFavoriteType: () => 'mock',
  reportAddFavoriteClick: () => {},
  reportRemoveFavoriteClick: () => {},
};

const defaultSupports: ContentListSupports = {
  sorting: true,
  pagination: true,
  search: true,
  selection: true,
  tags: false,
  starred: true,
  userProfiles: false,
};

const defaultContext: ColumnBuilderContext = {
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  supports: defaultSupports,
};

const createWrapper =
  (initialSearch?: string) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        services={{ favorites: mockFavoritesService }}
        features={initialSearch ? { search: { initialSearch } } : undefined}
      >
        {children}
      </ContentListProvider>
    );

describe('starred column builder', () => {
  it('returns undefined when starred support is unavailable', () => {
    const result = buildStarredColumn(
      {},
      {
        ...defaultContext,
        supports: { ...defaultSupports, starred: false },
      }
    );

    expect(result).toBeUndefined();
  });

  it('returns the default starred column', () => {
    const result = buildStarredColumn({}, defaultContext);

    expect(result).toMatchObject({
      field: 'id',
      align: 'center',
      sortable: false,
      width: '40px',
      'data-test-subj': 'content-list-table-column-starred',
    });
  });

  it('uses a custom width when provided', () => {
    const result = buildStarredColumn(
      { width: '64px' } satisfies StarredColumnProps,
      defaultContext
    );

    expect(result).toMatchObject({ width: '64px' });
  });

  it('renders the starred header and cell', () => {
    const result = buildStarredColumn({}, defaultContext) as StarredColumn;
    const item: ContentListItem = {
      id: 'item-1',
      title: 'Dashboard',
    };

    render(
      <>
        {result.name as React.ReactElement}
        {result.render?.(item.id, item) as React.ReactElement}
      </>,
      {
        wrapper: createWrapper('is:starred'),
      }
    );

    expect(screen.getByText('Starred')).toHaveAttribute('data-euiicon-type', 'starFilled');
    expect(screen.getByTestId('mock-favorite-button')).toHaveAttribute('data-id', 'item-1');
  });
});
