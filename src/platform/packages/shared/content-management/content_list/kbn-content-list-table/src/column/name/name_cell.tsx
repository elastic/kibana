/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import type { ContentListItem } from '@kbn/content-list-provider';

import { StarButton } from '../starred/star_button';
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
   * Whether to show a star button inline after the title.
   * Requires `services.favorites` to be configured on the `ContentListProvider`.
   *
   * @default false
   */
  showStarred?: boolean;
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
 * - Inline star button (if `showStarred` is true and `supports.starred`).
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
  ({
    item,
    showDescription = true,
    showTags = false,
    showStarred = false,
    onTagClick,
  }: NameCellProps) => {
    const { tags: tagIds } = item;
    const hasTags = showTags && tagIds && tagIds.length > 0;
    const { euiTheme } = useEuiTheme();

    // Aligns title and star button on the same row.
    const titleRowCss = useMemo(
      () => css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xxs};
      `,
      [euiTheme]
    );

    // Vertical margin compensation matches `TableListView`'s `ItemDetails` component.
    // Memoized so `StarButton` receives a stable css reference across re-renders.
    const inlineStarCss = useMemo(
      () => css`
        margin-top: -${euiTheme.size.xxs};
        margin-bottom: -${euiTheme.size.s};
      `,
      [euiTheme]
    );

    return (
      <div>
        <div css={showStarred ? titleRowCss : undefined}>
          <Title item={item} />
          {showStarred && <StarButton id={item.id} css={inlineStarCss} />}
        </div>
        {showDescription && <Description item={item} />}
        {hasTags && <Tags tagIds={tagIds} onTagClick={onTagClick} />}
      </div>
    );
  }
);

NameCell.displayName = 'NameCell';
