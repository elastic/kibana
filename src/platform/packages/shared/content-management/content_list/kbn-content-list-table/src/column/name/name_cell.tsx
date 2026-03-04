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
import { NameCellDescription as Description } from './cell_description';
import { NameCellTags as Tags, type NameCellTagsProps } from './cell_tags';

export interface NameCellProps {
  item: ContentListItem;
  /**
   * Whether to show the description.
   *
   * @default true
   */
  showDescription?: boolean;
  /**
   * Whether to show tags below the title/description.
   * Requires `item.tags` to contain tag IDs and a tags service
   * to be configured on the `ContentListProvider`.
   *
   * @default false
   */
  showTags?: boolean;
  /**
   * Optional click handler for tag badges.
   * When omitted, the built-in handler in {@link NameCellTags} toggles
   * include/exclude filters via `useContentListFilters`.
   */
  onTagClick?: NameCellTagsProps['onTagClick'];
}

/**
 * Default rich renderer for the name column that includes:
 * - Clickable title (with href or onClick).
 * - Description (if available and `showDescription` is true).
 * - Tag badges (if available and `showTags` is true).
 *
 * When `showTags` is true, clicking a tag badge toggles a filter on the
 * content list (include on click, exclude on modifier+click). Provide
 * `onTagClick` to override this behavior.
 *
 * Memoized to prevent unnecessary re-renders when parent table re-renders.
 */
export const NameCell = memo(
  ({ item, showDescription = true, showTags = false, onTagClick }: NameCellProps) => {
    const { tags: tagIds } = item;
    const hasTags = showTags && tagIds && tagIds.length > 0;

    return (
      <div>
        <Title item={item} />
        {showDescription && <Description item={item} />}
        {hasTags && <Tags tagIds={tagIds} onTagClick={onTagClick} />}
      </div>
    );
  }
);

NameCell.displayName = 'NameCell';
