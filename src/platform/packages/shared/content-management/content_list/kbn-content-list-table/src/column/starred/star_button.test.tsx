/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import {
  ContentListProvider,
  type FindItemsParams,
  type FindItemsResult,
} from '@kbn/content-list-provider';
import { StarButton } from './star_button';

jest.mock('@kbn/content-management-favorites-public', () => {
  const actual = jest.requireActual('@kbn/content-management-favorites-public');

  return {
    ...actual,
    FavoriteButton: ({ id, className }: { id: string; className?: string }) => (
      <button data-test-subj="mock-favorite-button" data-id={id} className={className}>
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
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        services={favorites ? { favorites } : undefined}
      >
        {children}
      </ContentListProvider>
    );

describe('StarButton', () => {
  it('renders nothing when starred support is unavailable', () => {
    const { container } = render(<StarButton id="item-1" />, {
      wrapper: createWrapper(),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the favorite button directly when wrapperCss is not provided', () => {
    render(<StarButton id="item-1" className="favorite-class" />, {
      wrapper: createWrapper(mockFavoritesService),
    });

    expect(screen.getByTestId('mock-favorite-button')).toHaveAttribute('data-id', 'item-1');
    expect(screen.getByTestId('mock-favorite-button')).toHaveClass('favorite-class');
    expect(screen.getByTestId('mock-favorite-button').parentElement?.tagName).not.toBe('SPAN');
  });

  it('wraps the favorite button when wrapperCss is provided', () => {
    render(<StarButton id="item-2" wrapperCss={css({ marginInlineEnd: 4 })} />, {
      wrapper: createWrapper(mockFavoritesService),
    });

    expect(screen.getByTestId('mock-favorite-button').parentElement?.tagName).toBe('SPAN');
  });
});
