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
import { FavoriteButton as FavoriteButtonView } from '@kbn/favorite-button';
import { useFavorite } from '../use_favorite';

export interface FavoriteButtonProps {
  id: string;
  className?: string;
}

const ADD_LABEL = i18n.translate('contentManagement.favorites.favoriteButtonLabel', {
  defaultMessage: 'Add to Starred',
});

const REMOVE_LABEL = i18n.translate('contentManagement.favorites.unfavoriteButtonLabel', {
  defaultMessage: 'Remove from Starred',
});

export const FavoriteButton = ({ id, className }: FavoriteButtonProps) => {
  const favorite = useFavorite({ id });

  if (!favorite) {
    return null;
  }

  const isPersistedFavorite = favorite.status === 'favorited' || favorite.status === 'removing';

  return (
    <FavoriteButtonView
      status={favorite.status}
      onClick={favorite.onToggle}
      addLabel={ADD_LABEL}
      removeLabel={REMOVE_LABEL}
      className={className}
      data-test-subj={isPersistedFavorite ? 'unfavoriteButton' : 'favoriteButton'}
    />
  );
};
