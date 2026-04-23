/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

import type { ContentListItem } from '@kbn/content-list-provider';
import { useContentListConfig } from '@kbn/content-list-provider';

export interface NameCellTitleProps {
  item: ContentListItem;
  /**
   * Whether to use the provider-level `item.getHref` for the title link.
   * Defaults to `true` unless `onClick` is provided.
   */
  shouldUseHref?: boolean;
  /**
   * Optional click handler for the title. When provided, the provider-level
   * `item.getHref` is ignored unless `shouldUseHref` is explicitly `true`.
   */
  onClick?: (item: ContentListItem) => void;
}

const isPlainPrimaryClick = (event: React.MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export const NameCellTitle = ({ item, shouldUseHref, onClick }: NameCellTitleProps) => {
  const { title } = item;
  const { item: itemConfig } = useContentListConfig();

  const useHref = shouldUseHref ?? !onClick;
  const href = useHref ? itemConfig?.getHref?.(item) : undefined;

  if (!href && !onClick) {
    return (
      <EuiText size="s">
        <span>{title}</span>
      </EuiText>
    );
  }

  const handleClick = onClick
    ? (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (href && !isPlainPrimaryClick(event)) {
          return;
        }
        event.preventDefault();
        onClick(item);
      }
    : undefined;

  return (
    <EuiText size="s">
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click -- Intentional when `shouldUseHref` preserves native link affordances while `onClick` handles plain clicks. */}
      <EuiLink href={href} onClick={handleClick} data-test-subj="content-list-table-item-link">
        {title}
      </EuiLink>
    </EuiText>
  );
};
