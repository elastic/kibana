/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { EuiButtonIcon, euiCanAnimate, EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFavorites, useRemoveFavorite, useAddFavorite } from '../favorites_query';
import { useFavoritesClient } from '../favorites_context';

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

  if (isFavorite) {
    const title = i18n.translate('contentManagement.favorites.unfavoriteButtonLabel', {
      defaultMessage: 'Remove from Starred',
    });

    return (
      <EuiButtonIcon
        isLoading={removeFavorite.isLoading}
        title={title}
        aria-label={title}
        iconType={'starFilled'}
        onClick={() => {
          favoritesClient?.reportRemoveFavoriteClick();
          removeFavorite.mutate({ id });
        }}
        className={classNames(className, 'cm-favorite-button', {
          'cm-favorite-button--active': !removeFavorite.isLoading,
        })}
        data-test-subj="unfavoriteButton"
      />
    );
  } else {
    const title = i18n.translate('contentManagement.favorites.favoriteButtonLabel', {
      defaultMessage: 'Add to Starred',
    });
    return (
      <EuiButtonIcon
        isLoading={addFavorite.isLoading}
        title={title}
        aria-label={title}
        iconType={'starEmpty'}
        onClick={() => {
          favoritesClient?.reportAddFavoriteClick();
          addFavorite.mutate({ id });
        }}
        className={classNames(className, 'cm-favorite-button', {
          'cm-favorite-button--empty': !addFavorite.isLoading,
        })}
        data-test-subj="favoriteButton"
      />
    );
  }
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
