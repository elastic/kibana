/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FavoriteStarButton } from './favorite_star_button';

// Mock dependencies
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key: string, options: any) => options?.defaultMessage || key),
  },
}));

jest.mock('@kbn/content-management-favorites-public', () => ({
  StardustWrapper: ({ children, active }: any) => (
    <div data-testid="stardust-wrapper" data-active={active}>
      {children}
    </div>
  ),
}));

// Mock FavoritesService
const mockFavoritesService = {
  isFavorite: jest.fn(),
  toggleFavorite: jest.fn(),
} as any;

describe('FavoriteStarButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render star empty icon when not favorited', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(false);

    render(
      <FavoriteStarButton type="dashboard" id="test-id" favoritesService={mockFavoritesService} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });

    expect(screen.getByTestId('favoriteButton')).toHaveAttribute('aria-label', 'Add to favorites');
  });

  it('should render star filled icon when favorited', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(true);

    render(
      <FavoriteStarButton type="dashboard" id="test-id" favoritesService={mockFavoritesService} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('unfavoriteButton')).toBeInTheDocument();
    });

    expect(screen.getByTestId('unfavoriteButton')).toHaveAttribute(
      'aria-label',
      'Remove from favorites'
    );
  });

  it('should call toggleFavorite when clicked', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(false);
    mockFavoritesService.toggleFavorite.mockResolvedValue(true);

    render(
      <FavoriteStarButton type="dashboard" id="test-id" favoritesService={mockFavoritesService} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('favoriteButton'));

    await waitFor(() => {
      expect(mockFavoritesService.toggleFavorite).toHaveBeenCalledWith('dashboard', 'test-id');
    });
  });

  it('should call onFavoriteChange callback when favorite status changes', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(false);
    mockFavoritesService.toggleFavorite.mockResolvedValue(true);
    const onFavoriteChange = jest.fn();

    render(
      <FavoriteStarButton
        type="dashboard"
        id="test-id"
        favoritesService={mockFavoritesService}
        onFavoriteChange={onFavoriteChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('favoriteButton'));

    await waitFor(() => {
      expect(onFavoriteChange).toHaveBeenCalledWith(true);
    });
  });

  it('should show loading state while toggling', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(false);
    mockFavoritesService.toggleFavorite.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
    );

    render(
      <FavoriteStarButton type="dashboard" id="test-id" favoritesService={mockFavoritesService} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('favoriteButton'));

    // Check that the button is disabled during loading
    await waitFor(() => {
      const button =
        screen.queryByTestId('favoriteButton') || screen.queryByTestId('unfavoriteButton');
      expect(button).toBeDisabled();
    });
  });

  it('should always show when alwaysShow prop is true', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(false);

    render(
      <FavoriteStarButton
        type="dashboard"
        id="test-id"
        favoritesService={mockFavoritesService}
        alwaysShow={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });

    // The button should not have hover-only styles when alwaysShow is true
    const button = screen.getByTestId('favoriteButton');
    expect(button).toBeVisible();
  });

  it('should handle errors gracefully', async () => {
    mockFavoritesService.isFavorite.mockRejectedValue(new Error('Network error'));

    render(
      <FavoriteStarButton type="dashboard" id="test-id" favoritesService={mockFavoritesService} />
    );

    // Should still render even if initial status check fails
    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });
  });

  it('should prevent multiple clicks while loading', async () => {
    mockFavoritesService.isFavorite.mockResolvedValue(false);
    mockFavoritesService.toggleFavorite.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
    );

    render(
      <FavoriteStarButton type="dashboard" id="test-id" favoritesService={mockFavoritesService} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('favoriteButton')).toBeInTheDocument();
    });

    const button = screen.getByTestId('favoriteButton');
    fireEvent.click(button);
    fireEvent.click(button); // Second click should be ignored

    // Should only call toggleFavorite once
    await waitFor(() => {
      expect(mockFavoritesService.toggleFavorite).toHaveBeenCalledTimes(1);
    });
  });
});
