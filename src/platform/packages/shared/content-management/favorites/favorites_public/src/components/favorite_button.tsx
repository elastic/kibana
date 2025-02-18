/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { EuiButtonIcon, euiCanAnimate, EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAddFavorite, useFavorites, useRemoveFavorite } from '../favorites_query';
import { useFavoritesClient } from '../favorites_context';
import { StardustWrapper } from './stardust_wrapper';

export interface FavoriteButtonProps {
  id: string;
  className?: string;
}

export const FavoriteButton = ({ id, className }: FavoriteButtonProps) => {
  const { data } = useFavorites();

  const removeFavorite = useRemoveFavorite();
  const addFavorite = useAddFavorite();

  const favoritesClient = useFavoritesClient();

  if (!data) return null;

  const isFavorite = data.favoriteIds.includes(id);
  const isFavoriteOptimistic = isFavorite || addFavorite.isLoading;

  const title = isFavoriteOptimistic
    ? i18n.translate('contentManagement.favorites.unfavoriteButtonLabel', {
        defaultMessage: 'Remove from Starred',
      })
    : i18n.translate('contentManagement.favorites.favoriteButtonLabel', {
        defaultMessage: 'Add to Starred',
      });

  return (
    <StardustWrapper
      className={className}
      active={(isFavorite && addFavorite.isSuccess) || addFavorite.isLoading}
    >
      <EuiButtonIcon
        isLoading={removeFavorite.isLoading}
        title={title}
        aria-label={title}
        iconType={isFavoriteOptimistic ? 'starFilled' : 'starEmpty'}
        onClick={() => {
          if (addFavorite.isLoading || removeFavorite.isLoading) return;

          if (isFavorite) {
            favoritesClient?.reportRemoveFavoriteClick();
            removeFavorite.mutate({ id });
          } else {
            favoritesClient?.reportAddFavoriteClick();
            addFavorite.mutate({ id });
          }
        }}
        className={classNames('cm-favorite-button', {
          'cm-favorite-button--active': isFavorite && !removeFavorite.isLoading,
          'cm-favorite-button--empty': !isFavorite && !addFavorite.isLoading,
        })}
        data-test-subj={isFavorite ? 'unfavoriteButton' : 'favoriteButton'}
      />
    </StardustWrapper>
  );
};

/**
 * CSS to apply to euiTable to show the favorite button on hover or when active
 * @param euiTheme
 */
export const cssFavoriteHoverWithinEuiTableRow = (euiTheme: EuiThemeComputed) => css`
  @media (hover: hover) {
    .euiTableRow .cm-favorite-button--empty {
      visibility: hidden;
      opacity: 0;
      ${euiCanAnimate} {
        transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
      }
    }
    .euiTableRow:hover,
    .euiTableRow:focus-within {
      .cm-favorite-button--empty {
        visibility: visible;
        opacity: 1;
      }
    }
  }
`;
