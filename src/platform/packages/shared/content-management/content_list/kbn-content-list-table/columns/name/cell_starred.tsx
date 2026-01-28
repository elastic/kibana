/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

import { FavoriteButton } from '@kbn/content-management-favorites-public';

import type { ContentListItem } from '@kbn/content-list-provider';
import { useContentListConfig } from '@kbn/content-list-provider';

export interface NameCellStarredProps {
  item: ContentListItem;
}

/**
 * Star button for the name cell.
 * Starred filtering is reactive - when favorites change, the list updates automatically
 * via useMemo in the state provider. No manual refetch needed.
 */
export const NameCellStarred: FC<NameCellStarredProps> = ({ item }) => {
  const { euiTheme } = useEuiTheme();
  const { supports } = useContentListConfig();

  // Don't render if starred is not enabled at the provider level,
  // or if the item explicitly opts out of starring.
  // Uses opt-out model: `canStar: false` hides the button, `undefined` or `true` shows it.
  if (!supports?.starred || item.canStar === false) {
    return null;
  }

  return (
    <FavoriteButton
      id={item.id}
      className={css`
        margin-top: -${euiTheme.size.xxs}; // nicer align the star with the title
        margin-bottom: -${euiTheme.size.s};
        margin-left: ${euiTheme.size.xxs};
      `}
    />
  );
};
