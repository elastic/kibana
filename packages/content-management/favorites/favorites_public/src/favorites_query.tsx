/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { useFavoritesClient, useFavoritesContext } from './favorites_context';

const favoritesKeys = {
  all: ['favorites'] as const,
  byType: (type: string) => [...favoritesKeys.all, type] as const,
};

export const useFavorites = ({ enabled = true }: { enabled?: boolean } = { enabled: true }) => {
  const favoritesClient = useFavoritesClient();
  return useQuery(
    favoritesKeys.byType(favoritesClient.getFavoriteType()),
    () => favoritesClient.getFavorites(),
    { enabled }
  );
};

export const useAddFavorite = () => {
  const favoritesClient = useFavoritesClient();
  const notifyError = useFavoritesContext().notifyError;
  const queryClient = useQueryClient();
  return useMutation(
    ({ id }: { id: string }) => {
      return favoritesClient.addFavorite({ id });
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(favoritesKeys.byType(favoritesClient.getFavoriteType()));
      },
      onError: (error: Error) => {
        notifyError(
          <>
            {i18n.translate('contentManagement.favorites.addFavoriteError', {
              defaultMessage: 'Error adding to starred',
            })}
          </>,
          error?.message
        );
      },
    }
  );
};

export const useRemoveFavorite = () => {
  const favoritesClient = useFavoritesClient();
  const notifyError = useFavoritesContext().notifyError;
  const queryClient = useQueryClient();
  return useMutation(
    ({ id }: { id: string }) => {
      return favoritesClient.removeFavorite({ id });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(favoritesKeys.byType(favoritesClient.getFavoriteType()));
      },
      onError: (error: Error) => {
        notifyError(
          <>
            {i18n.translate('contentManagement.favorites.removeFavoriteError', {
              defaultMessage: 'Error removing from starred',
            })}
          </>,
          error?.message
        );
      },
    }
  );
};
