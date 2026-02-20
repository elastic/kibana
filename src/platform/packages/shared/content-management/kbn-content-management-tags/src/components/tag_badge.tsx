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
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import type { Tag } from '../types';

/**
 * Props for the {@link TagBadge} component.
 */
export interface TagBadgeProps {
  /** The tag object to display. */
  tag: Tag;
  /**
   * Optional click handler. Called with the tag and a boolean indicating whether a modifier key
   * (Cmd on Mac, Ctrl on Windows/Linux) was held during the click.
   * @param tag - The clicked tag.
   * @param withModifierKey - Whether a modifier key was held during the click.
   */
  onClick?: (tag: Tag, withModifierKey: boolean) => void;
}

/**
 * Renders a tag as a colored EUI badge.
 *
 * This is the standard visual representation for tags in the content management UI.
 * The badge displays the tag name with its configured color and shows the description
 * as a tooltip on hover.
 *
 * When an `onClick` handler is provided, the badge becomes interactive and supports
 * modifier-key clicks (Cmd on macOS, Ctrl on Windows/Linux) for alternate actions
 * such as adding to an exclude filter instead of an include filter.
 *
 * @example
 * ```tsx
 * // Static badge (no interaction)
 * <TagBadge tag={myTag} />
 *
 * // Interactive badge with click handling
 * <TagBadge
 *   tag={myTag}
 *   onClick={(tag, withModifier) => {
 *     if (withModifier) {
 *       excludeTag(tag);
 *     } else {
 *       includeTag(tag);
 *     }
 *   }}
 * />
 * ```
 */
export const TagBadge: FC<TagBadgeProps> = (props: TagBadgeProps) => {
  const { tag, onClick } = props;
  const { name: tagName, color, description: title, id } = tag;

  const badgeProps = {
    color,
    title,
    'data-test-subj': `tag-${id}`,
    children: tagName,
  };

  if (!onClick) {
    return <EuiBadge {...badgeProps} />;
  }

  return (
    <EuiBadge
      {...badgeProps}
      onClick={(e) => {
        e.stopPropagation();
        const withModifierKey = (isMac && e.metaKey) || (!isMac && e.ctrlKey);
        onClick(tag, withModifierKey);
      }}
      onClickAriaLabel={i18n.translate('contentManagement.tags.tagBadge.buttonLabel', {
        defaultMessage: '{tagName} tag',
        values: {
          tagName,
        },
      })}
    />
  );
};
