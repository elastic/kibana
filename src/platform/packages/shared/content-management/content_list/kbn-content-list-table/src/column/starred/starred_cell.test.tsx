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
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import {
  ContentListProvider,
  type FindItemsParams,
  type FindItemsResult,
} from '@kbn/content-list-provider';
import { StarredCell } from './starred_cell';

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

const createWrapper =
  (favorites?: FavoritesClientPublic) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        services={favorites ? { favorites } : undefined}
      >
        {children}
      </ContentListProvider>
    );

describe('StarredCell', () => {
  it('renders the star button with the given item ID.', () => {
    render(<StarredCell id="item-42" />, {
      wrapper: createWrapper(mockFavoritesService),
    });

    expect(screen.getByTestId('mock-favorite-button')).toHaveAttribute('data-id', 'item-42');
  });

  it('renders nothing when starred support is unavailable.', () => {
    const { container } = render(<StarredCell id="item-42" />, {
      wrapper: createWrapper(),
    });

    expect(container.querySelector('[data-test-subj="mock-favorite-button"]')).toBeNull();
  });

  it('wraps the star button in a centered flex container.', () => {
    render(<StarredCell id="item-42" />, {
      wrapper: createWrapper(mockFavoritesService),
    });

    const wrapper = screen.getByTestId('mock-favorite-button').closest('span');
    expect(wrapper).toBeInTheDocument();
  });

  it('is memoized (same props produce same output).', () => {
    expect(StarredCell.displayName).toBe('StarredCell');
  });
});
