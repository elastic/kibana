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
}

export const NameCellTitle = ({ item }: NameCellTitleProps) => {
  const { title } = item;
  const { item: itemConfig } = useContentListConfig();

  const href = itemConfig?.getHref?.(item);

  // If not clickable, render as plain text.
  if (!href) {
    return (
      <EuiText size="s">
        <span>{title}</span>
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      <EuiLink href={href} data-test-subj="content-list-table-item-link">
        {title}
      </EuiLink>
    </EuiText>
  );
};
