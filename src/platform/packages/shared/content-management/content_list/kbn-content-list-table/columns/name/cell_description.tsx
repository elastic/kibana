/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
import { useContentListFilters } from '@kbn/content-list-provider';
import { EuiText, EuiHighlight } from '@elastic/eui';

/**
 * Escape special regex characters for use in EuiHighlight search prop
 */
const escapeRegExp = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export interface NameCellDescriptionProps {
  item: ContentListItem;
}

export const NameCellDescription = ({ item }: NameCellDescriptionProps) => {
  const { filters } = useContentListFilters();
  const searchTerm = filters.search ?? '';

  if (!item.description) {
    return null;
  }

  return (
    <EuiText size="s" color="subdued">
      <p>
        <EuiHighlight highlightAll search={escapeRegExp(searchTerm)}>
          {item.description}
        </EuiHighlight>
      </p>
    </EuiText>
  );
};
