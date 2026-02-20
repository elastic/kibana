/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';

import type { ContentListItem } from '@kbn/content-list-provider';

import { NameCellTitle as Title } from './cell_title';
import { NameCellDescription as Description } from './cell_description';

export interface NameCellProps {
  item: ContentListItem;
  /**
   * Whether to show the description.
   *
   * @default true
   */
  showDescription?: boolean;
}

/**
 * Default rich renderer for the name column that includes:
 * - Clickable title (with href or onClick).
 * - Description (if available and showDescription is true).
 *
 * Memoized to prevent unnecessary re-renders when parent table re-renders.
 */
export const NameCell = memo(({ item, showDescription = true }: NameCellProps) => {
  return (
    <div>
      <Title item={item} />
      {showDescription && <Description item={item} />}
    </div>
  );
});

NameCell.displayName = 'NameCell';
