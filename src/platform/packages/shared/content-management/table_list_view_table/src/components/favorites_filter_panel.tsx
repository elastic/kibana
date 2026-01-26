/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFilterButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface FavoritesFilterButtonProps {
  isFavoritesOnly: boolean;
  onToggleFavorites: () => void;
}

export function FavoritesFilterButton({
  isFavoritesOnly,
  onToggleFavorites,
}: FavoritesFilterButtonProps) {
  return (
    <EuiFilterButton
      iconType={isFavoritesOnly ? 'starFilled' : 'starEmpty'}
      iconSide="left"
      data-test-subj="favoritesFilterButton"
      onClick={onToggleFavorites}
      isToggle={true}
      isSelected={isFavoritesOnly}
    >
      {i18n.translate('contentManagement.tableList.listing.favoritesFilter.filterLabel', {
        defaultMessage: 'Starred',
      })}
    </EuiFilterButton>
  );
}
