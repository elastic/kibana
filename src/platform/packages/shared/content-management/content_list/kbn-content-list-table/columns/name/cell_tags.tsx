/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { TagList, type Tag } from '@kbn/content-management-tags';
import type { ContentListItem } from '@kbn/content-list-provider';
import { useQueryFilter } from '@kbn/content-list-provider';

export interface NameCellTagsProps {
  item: ContentListItem;
}

export const NameCellTags = ({ item }: NameCellTagsProps) => {
  const { toggle } = useQueryFilter('tag');

  // Handle tag click - toggle tag in query text (same as Tags filter toolbar)
  const handleTagClick = useCallback(
    (tag: Tag) => {
      const tagName = tag.name;
      if (!tagName) {
        return;
      }
      toggle(tagName);
    },
    [toggle]
  );

  // Check if item has tags (prepared by transform function)
  if (!item.tags || item.tags.length === 0) {
    return null;
  }

  // Use TagList for rich tag rendering with click handlers
  return (
    <>
      <EuiSpacer size="s" />
      <TagList tagIds={item.tags} onClick={handleTagClick} />
    </>
  );
};
