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
import type { Tag } from '../types';

/**
 * Props for the {@link TagBadge} component.
 *
 * @property tag - The tag object to display.
 * @property onClick - Optional click handler. Called with the tag and a boolean indicating whether a modifier key (Cmd on Mac, Ctrl on Windows/Linux) was held during the click.
 */
export interface TagBadgeProps {
  tag: Tag;
  onClick?: (tag: Tag, withModifierKey: boolean) => void;
}

/**
 * Navigator with User-Agent Client Hints API support.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
 */
interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string };
}

/**
 * Platform detection IIFE - runs once at module load.
 * Note: The `typeof navigator === 'undefined'` check is defensive code for
 * non-browser environments (SSR/Node.js) where `navigator` is not available.
 * In Jest's jsdom environment `navigator` is always defined, so exercising this
 * branch would require mutating or deleting `global.navigator`, which can interfere
 * with other tests that rely on the default navigator setup.
 */
const isMac = (() => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const nav = navigator as NavigatorWithUserAgentData;
  const platform = nav.userAgentData?.platform ?? nav.platform ?? '';

  return platform.toLowerCase().includes('mac');
})();

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
 * @param props - The component props.
 * @param props.tag - The tag to render.
 * @param props.onClick - Optional click handler receiving the tag and modifier key state.
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
export const TagBadge: FC<TagBadgeProps> = ({ tag, onClick }) => {
  const { name: tagName, color, description: title, id } = tag;

  const props = {
    color,
    title,
    'data-test-subj': `tag-${id}`,
    children: tagName,
  };

  if (!onClick) {
    return <EuiBadge {...props} />;
  }

  return (
    <EuiBadge
      {...props}
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

