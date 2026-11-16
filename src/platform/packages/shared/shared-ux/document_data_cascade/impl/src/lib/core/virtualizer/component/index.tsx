/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../../store_provider';
import type { CascadeTableRow } from '../../table';
import type { CascadeVirtualizerReturnValue } from '../types';

export interface VirtualizedCascadeListProps<G extends GroupNode>
  extends Pick<CascadeVirtualizerReturnValue, 'getVirtualItems'> {
  rows: Array<CascadeTableRow<G>>;
  activeStickyIndex: number | null;
  listItemRenderer: (props: {
    isActiveSticky: boolean;
    virtualItem: VirtualItem;
    virtualRowStyle: React.CSSProperties;
    row: CascadeTableRow<G>;
  }) => React.ReactNode;
}

const VirtualizedRow = <G extends GroupNode>({
  virtualItem,
  row,
  isActiveSticky,
  zIndex,
  listItemRenderer,
}: {
  virtualItem: VirtualItem;
  row: CascadeTableRow<G>;
  isActiveSticky: boolean;
  zIndex: number;
  listItemRenderer: VirtualizedCascadeListProps<G>['listItemRenderer'];
}) => {
  const virtualRowStyle = useMemo(
    () => ({ transform: `translateY(${virtualItem.start}px)`, zIndex }),
    [virtualItem.start, zIndex]
  );
  return <>{listItemRenderer({ row, virtualItem, isActiveSticky, virtualRowStyle })}</>;
};

export function VirtualizedCascadeRowList<G extends GroupNode>({
  activeStickyIndex,
  getVirtualItems,
  rows,
  listItemRenderer,
}: VirtualizedCascadeListProps<G>) {
  const items = getVirtualItems();
  return items.map((virtualItem, index) => (
    <VirtualizedRow
      key={virtualItem.key}
      virtualItem={virtualItem}
      row={rows[virtualItem.index]}
      isActiveSticky={activeStickyIndex === virtualItem.index}
      zIndex={items.length - index}
      listItemRenderer={listItemRenderer}
    />
  ));
}
