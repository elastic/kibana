/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';

import type { ContentListItem } from '@kbn/content-list-provider';

import { NameCellTitle as Title } from './cell_title';
import { NameCellTags as Tags } from './cell_tags';
import { NameCellDescription as Description } from './cell_description';

export interface NameCellProps {
  item: ContentListItem;
  /**
   * Whether to show the description.
   * @default true
   */
  showDescription?: boolean;
  /**
   * Whether to show tags.
   * @default true
   */
  showTags?: boolean;
  /**
   * Whether to show the starred button.
   * @default true
   */
  showStarred?: boolean;
}

/**
 * Default rich renderer for the name column that includes:
 * - Clickable title (with href or onClick)
 * - Description (if available and showDescription is true)
 * - Tags (if available and showTags is true)
 * - Starred button (if enabled via provider and showStarred is true)
 *
 * Matches the ItemDetails component from TableListViewTable.
 *
 * Memoized to prevent unnecessary re-renders when parent table re-renders.
 *
 * @note Starred functionality requires FavoritesContextProvider to be set up in your application.
 * @see https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/content-management/favorites
 */
export const NameCell = memo(
  ({ item, showDescription = true, showTags = true, showStarred = true }: NameCellProps) => {
    return (
      <div>
        <Title item={item} showStarred={showStarred} />
        {showDescription && <Description item={item} />}
        {showTags && <Tags item={item} />}
      </div>
    );
  }
);

NameCell.displayName = 'NameCell';
