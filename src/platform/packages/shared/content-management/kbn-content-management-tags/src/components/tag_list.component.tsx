/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { css } from '@emotion/react';
import type { Tag } from '../types';
import { TagBadge } from './tag_badge';

/**
 * Props for the {@link TagListComponent}.
 */
export interface TagListComponentProps {
  /** Array of tag objects to render as badges. */
  tags: Tag[];
  /**
   * Optional click handler passed to each {@link TagBadge}. Called with the clicked tag and modifier key state.
   * @param tag - The clicked tag.
   * @param withModifierKey - Whether a modifier key was held during the click.
   */
  onClick?: (tag: Tag, withModifierKey: boolean) => void;
}

/**
 * Pure component that renders a horizontal list of tag badges.
 *
 * This is a presentational component that accepts pre-resolved tag objects.
 * For a connected version that resolves tag IDs via context, use {@link TagList}.
 *
 * The tags are rendered as {@link TagBadge} components in a flexbox layout
 * with wrapping enabled for responsive display.
 *
 * @returns The rendered tag list, or `null` if the tags array is empty.
 *
 * @example
 * ```tsx
 * <TagListComponent
 *   tags={[productionTag, frontendTag]}
 *   onClick={(tag, withModifier) => handleTagClick(tag, withModifier)}
 * />
 * ```
 */
export const TagListComponent: FC<TagListComponentProps> = (props: TagListComponentProps) => {
  const { tags, onClick } = props;
  if (tags.length === 0) {
    return null;
  }

  return (
    <div
      css={({ euiTheme }) => css`
        display: flex;
        flex-wrap: wrap;
        gap: ${euiTheme.size.xs};
      `}
    >
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} onClick={onClick} />
      ))}
    </div>
  );
};
