/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Query } from '@elastic/eui';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { StarredFilterRenderer } from './starred_filter_renderer';

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

const createWrapper = (options?: { favoritesService?: FavoritesClientPublic }) => {
  const { favoritesService } = options ?? {};
  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      services={favoritesService ? { favorites: favoritesService } : undefined}
    >
      {children}
    </ContentListProvider>
  );
};

describe('StarredFilterRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the starred filter button when starred is available', () => {
    render(<StarredFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper({ favoritesService: mockFavoritesService }),
    });

    expect(screen.getByText('Starred')).toBeInTheDocument();
  });

  it('renders nothing when the favorites service is not available', () => {
    const { container } = render(<StarredFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper(),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('calls `onChange` with `is:starred` added when clicking the inactive button', () => {
    const onChange = jest.fn();

    render(<StarredFilterRenderer query={Query.parse('')} onChange={onChange} />, {
      wrapper: createWrapper({ favoritesService: mockFavoritesService }),
    });

    fireEvent.click(screen.getByText('Starred'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedQuery: Query = onChange.mock.calls[0][0];
    expect(updatedQuery.hasIsClause('starred')).toBe(true);
  });

  it('calls `onChange` with `is:starred` removed when clicking the active button', () => {
    const onChange = jest.fn();
    const activeQuery = Query.parse('').addMustIsClause('starred');

    render(<StarredFilterRenderer query={activeQuery} onChange={onChange} />, {
      wrapper: createWrapper({ favoritesService: mockFavoritesService }),
    });

    fireEvent.click(screen.getByText('Starred'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedQuery: Query = onChange.mock.calls[0][0];
    expect(updatedQuery.hasIsClause('starred')).toBe(false);
  });

  it('does not call `onChange` when `onChange` is not provided', () => {
    render(<StarredFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper({ favoritesService: mockFavoritesService }),
    });

    // Should not throw when clicking without an onChange handler.
    expect(() => fireEvent.click(screen.getByText('Starred'))).not.toThrow();
  });
});
