/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiLink, EuiText, EuiHighlight } from '@elastic/eui';

import type { ContentListItem } from '@kbn/content-list-provider';
import { useContentListConfig, useContentListFilters } from '@kbn/content-list-provider';

import { NameCellStarred } from './cell_starred';

/**
 * Escape special regex characters for use in EuiHighlight search prop
 * Copied from table_list_view_table/item_details.tsx
 */
const escapeRegExp = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export interface NameCellTitleProps {
  item: ContentListItem;
  /**
   * Whether to show the starred button.
   * @default true
   */
  showStarred?: boolean;
}

export const NameCellTitle: FC<NameCellTitleProps> = ({ item, showStarred = true }) => {
  const { title } = item;
  const { item: itemConfig } = useContentListConfig();
  const { filters } = useContentListFilters();
  const searchTerm = filters.search ?? '';

  const href = itemConfig?.getHref?.(item);
  const onClick = itemConfig?.actions?.onClick;
  const onClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!onClick) {
        return;
      }

      e.preventDefault();
      onClick(item);
    },
    [onClick, item]
  );

  // Render title with search term highlighting
  const renderTitle = () => (
    <EuiHighlight highlightAll search={escapeRegExp(searchTerm)}>
      {title}
    </EuiHighlight>
  );

  // If not clickable, render as plain text with highlighting
  if (!href && !onClick) {
    return <span>{renderTitle()}</span>;
  }

  return (
    <EuiText size="s">
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiLink
        href={href}
        onClick={onClick ? onClickHandler : undefined}
        data-test-subj="content-list-table-item-link"
      >
        {renderTitle()}
      </EuiLink>
      {showStarred && <NameCellStarred item={item} />}
    </EuiText>
  );
};
