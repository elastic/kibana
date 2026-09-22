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
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';

import { WIDE_VIEWPORT_NAME_BREAKPOINT_PX } from '../../breakpoints';

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
   * Optional click handler for the title.
   * When provided, the provider-level `item.getHref` is ignored unless
   * `shouldUseHref` is explicitly `true`.
   */
  onClick?: (item: ContentListItem) => void;
  /**
   * Whether to use the provider-level `item.getHref` for the title link.
   * Defaults to `true` unless `onClick` is provided.
   */
  shouldUseHref?: boolean;
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
    onClick,
    shouldUseHref,
    onTagClick,
  }: NameCellProps) => {
    const { tags: tagIds } = item;
    const hasTags = showTags && tagIds && tagIds.length > 0;
    const { euiTheme } = useEuiTheme();

    // Vertical margin compensation matches `TableListView`'s `ItemDetails` component.
    // Memoized so `StarButton` receives a stable css reference across re-renders.
    const inlineStarCss = useMemo(
      () => css`
        margin-top: -${euiTheme.size.m};
        margin-bottom: -${euiTheme.size.s};
      `,
      [euiTheme]
    );

    // At ≥ 2560px (~4K), pull title/description/tags onto a shared row so
    // sparse rows don't strand the populated cells in a tiny pocket on the
    // left of an otherwise empty Name column. `flex-wrap: wrap` lets rich
    // rows fall back to the column stack — a long description (or a long
    // title) wraps to the next line instead of being squeezed by a sibling
    // ({@link https://github.com/elastic/kibana/issues/271707}). `row-gap: 0`
    // preserves the original column-stack visual when wrapping kicks in.
    const wideRowCss = useMemo(
      () => css`
        @media (min-width: ${WIDE_VIEWPORT_NAME_BREAKPOINT_PX}px) {
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          column-gap: ${euiTheme.size.s};
          row-gap: 0;
        }
      `,
      [euiTheme]
    );

    return (
      <EuiFlexGroup direction="column" responsive={false} gutterSize="none" css={wideRowCss}>
        <EuiFlexItem grow={false}>
          {showStarred ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <Title {...{ item, onClick, shouldUseHref }} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StarButton id={item.id} wrapperCss={inlineStarCss} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <Title {...{ item, onClick, shouldUseHref }} />
          )}
        </EuiFlexItem>
        {showDescription && (
          <EuiFlexItem grow={false}>
            <Description item={item} />
          </EuiFlexItem>
        )}
        {hasTags && (
          <EuiFlexItem grow={false}>
            <Tags tagIds={tagIds} onTagClick={onTagClick} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

NameCell.displayName = 'NameCell';
