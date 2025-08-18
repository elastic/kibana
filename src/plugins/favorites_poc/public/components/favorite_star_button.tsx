/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StardustWrapper } from '@kbn/content-management-favorites-public';
import { FavoritesService } from '../services/favorites_service';

export interface FavoriteStarButtonProps {
  /** The type of object being favorited (e.g., 'dashboard', 'saved_search') */
  type: string;
  /** The ID of the object being favorited */
  id: string;
  /** Optional CSS class name */
  className?: string;
  /** The favorites service to use */
  favoritesService: FavoritesService;
  /** Callback when favorite status changes */
  onFavoriteChange?: (isFavorite: boolean) => void;
  /** Whether to show the button always (true) or only on hover (false) */
  alwaysShow?: boolean;
}

export const FavoriteStarButton: React.FC<FavoriteStarButtonProps> = ({
  type,
  id,
  className,
  favoritesService,
  onFavoriteChange,
  alwaysShow = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Check initial favorite status
  React.useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const status = await favoritesService.isFavorite(type, id);
        setIsFavorite(status);
      } catch (error) {
        // Handle errors gracefully - don't break the UI
        console.warn('Failed to check favorite status:', error);
        // Keep the default state (false) when API fails
        setIsFavorite(false);
      }
    };
    checkFavoriteStatus();
  }, [favoritesService, type, id]);

  const handleToggleFavorite = useCallback(async () => {
    if (isLoading) return;

    setHasUserInteracted(true);
    setIsLoading(true);
    try {
      const newStatus = await favoritesService.toggleFavorite(type, id);
      setIsFavorite(newStatus);
      onFavoriteChange?.(newStatus);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert the optimistic update
      setIsFavorite(!isFavorite);
      // Show a user-friendly error message
      console.warn('Favorite action failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [favoritesService, type, id, isLoading, isFavorite, onFavoriteChange]);

  const title = isFavorite
    ? i18n.translate('favoritesPoc.favoriteStarButton.removeFavoriteTitle', {
        defaultMessage: 'Remove from favorites',
      })
    : i18n.translate('favoritesPoc.favoriteStarButton.addFavoriteTitle', {
        defaultMessage: 'Add to favorites',
      });

  const buttonStyles = css`
    // No internal hover logic - rely on external CSS
  `;

  return (
    <StardustWrapper 
      className={isFavorite ? className?.replace('favorite-star-button--empty', '') : className}
      active={isFavorite && (hasUserInteracted || isLoading)}
    >
      <EuiButtonIcon
        isLoading={isLoading}
        title={title}
        aria-label={title}
        iconType={isFavorite ? 'starFilled' : 'starEmpty'}
        onClick={handleToggleFavorite}
        disabled={isLoading}
        data-test-subj={isFavorite ? 'unfavoriteButton' : 'favoriteButton'}
      />
    </StardustWrapper>
  );
};

/**
 * CSS to apply to tables to show favorite buttons on hover
 * This follows the same pattern as the existing favorites system
 */
export const cssFavoriteHoverWithinTable = (euiTheme: any) => css`
  @media (hover: hover) {
    .euiTableRow .favorite-star-button--empty,
    .euiDataGridRow .favorite-star-button--empty {
      visibility: hidden;
      opacity: 0;
      transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
    }
    
    .euiTableRow:hover .favorite-star-button--empty,
    .euiTableRow:focus-within .favorite-star-button--empty,
    .euiDataGridRow:hover .favorite-star-button--empty,
    .euiDataGridRow:focus-within .favorite-star-button--empty {
      visibility: visible;
      opacity: 1;
    }
  }
`;

/**
 * CSS for list items (EuiListGroup, etc.)
 */
export const cssFavoriteHoverWithinListItem = (euiTheme: any) => css`
  @media (hover: hover) {
    .euiListGroupItem .favorite-star-button--empty {
      visibility: hidden;
      opacity: 0;
      transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
    }
    
    .euiListGroupItem:hover .favorite-star-button--empty,
    .euiListGroupItem:focus-within .favorite-star-button--empty {
      visibility: visible;
      opacity: 1;
    }
  }
`;
