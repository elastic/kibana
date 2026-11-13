/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GroupNode } from '../../../../store_provider';
import type { CascadeTableRow } from '../../table';
import type { VirtualizerInstanceType, VirtualizerItem } from '../types';

/** Whether two lists hold the same items in the same order, compared by identity. */
export const areSameRows = (
  left: readonly VirtualizerItem[],
  right: readonly VirtualizerItem[]
): boolean => left.length === right.length && left.every((row, index) => row === right[index]);

/** Finds the nearest expanded ancestor in the flattened visible rows. */
export function calculateActiveStickyIndex<G extends GroupNode>(
  rows: Array<CascadeTableRow<G>>,
  startIndex: number,
  enableStickyGroupHeader: boolean
): number | null {
  if (!enableStickyGroupHeader) {
    return null;
  }

  const rangeStartRow = rows[startIndex];

  if (!rangeStartRow) {
    return null;
  }

  if (rangeStartRow.getIsExpanded()) {
    return startIndex;
  }

  const nearestParent = rangeStartRow.getParentRows().at(-1);

  if (!nearestParent) {
    return null;
  }

  // Table row indices are local to siblings; the virtualizer indexes the flattened visible rows.
  const parentIndex = rows.findIndex((row) => row.id === nearestParent.id);
  return parentIndex >= 0 ? parentIndex : null;
}

/** Scrolls a child item without treating its last row as the end of the shared container. */
export const scrollToChildItem = (
  instance: VirtualizerInstanceType,
  index: number,
  {
    align = 'auto',
    behavior = 'auto',
  }: Parameters<VirtualizerInstanceType['scrollToIndex']>[1] = {}
): void => {
  instance.getTotalSize();
  const item = instance.measurementsCache[Math.max(0, Math.min(index, instance.options.count - 1))];
  if (!item) return;
  const offset = instance.scrollOffset ?? 0;
  const height = instance.scrollRect?.height ?? instance.scrollElement?.clientHeight ?? 0;
  const { scrollPaddingStart, scrollPaddingEnd } = instance.options;
  const start = item.start - scrollPaddingStart;
  const end = item.end - height + scrollPaddingEnd;
  let target: number;
  if (align === 'start') target = start;
  else if (align === 'end') target = end;
  else if (align === 'center') target = (start + end) / 2;
  else if (start < offset || item.size > height - scrollPaddingStart - scrollPaddingEnd)
    target = start;
  else if (end > offset) target = end;
  else return;
  instance.scrollToOffset(target, { align: 'start', behavior });
};
