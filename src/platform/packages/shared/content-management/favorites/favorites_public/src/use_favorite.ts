/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { FavoriteButtonStatus } from '@kbn/favorite-button';
import { useAddFavorite, useFavorites, useRemoveFavorite } from './favorites_query';
import { useFavoritesClient } from './favorites_context';

export interface FavoriteToggleState {
  status: FavoriteButtonStatus;
  onToggle: () => void;
}

/**
 * Favorite toggle state for a single item.
 * Returns `undefined` until an id is present and favorites data has loaded.
 * Shape is structurally compatible with Core `AppHeaderFavoriteAction`.
 */
export const useFavorite = ({ id }: { id?: string }): FavoriteToggleState | undefined => {
  const { data } = useFavorites({ enabled: !!id });
  const { isLoading: isRemoving, mutate: removeMutate } = useRemoveFavorite();
  const { isLoading: isAdding, mutate: addMutate } = useAddFavorite();
  const favoritesClient = useFavoritesClient();

  const isPersistedFavorite = !!id && (data?.favoriteIds.includes(id) ?? false);

  const onToggle = useCallback(() => {
    if (!id || isAdding || isRemoving) {
      return;
    }

    if (isPersistedFavorite) {
      favoritesClient?.reportRemoveFavoriteClick();
      removeMutate({ id });
    } else {
      favoritesClient?.reportAddFavoriteClick();
      addMutate({ id });
    }
  }, [addMutate, favoritesClient, id, isAdding, isPersistedFavorite, isRemoving, removeMutate]);

  const status: FavoriteButtonStatus | undefined =
    !id || !data
      ? undefined
      : isAdding
      ? 'adding'
      : isRemoving
      ? 'removing'
      : isPersistedFavorite
      ? 'favorited'
      : 'unfavorited';

  return useMemo(() => (status ? { status, onToggle } : undefined), [status, onToggle]);
};
