/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Row } from '@tanstack/react-table';
import type { GroupNode, LeafNode } from '../store_provider';
import { getAdaptedTableRows } from './core/table';

/**
 * @description This function determines if the provided row is a group node or a leaf node.
 */
export function isCascadeGroupRowNode<G extends GroupNode, L extends LeafNode>(
  currentGroupByColumns: string[],
  row: Row<G>
): boolean {
  const { rowDepth } = getAdaptedTableRows<G, L>({ rowInstance: row });
  // for any selection of group by columns the inner most column is always a leaf node, hence the -1
  return rowDepth !== currentGroupByColumns.length - 1;
}

/**
 * @description This function returns the path of the row node in the group by hierarchy.
 */
export function getCascadeRowNodePath<G extends GroupNode, L extends LeafNode>(
  currentGroupByColumns: string[],
  row: Row<G>
) {
  const { rowDepth } = getAdaptedTableRows<G, L>({ rowInstance: row });
  // rowDepth is a zero based index, so we need to add 1 to get the correct slice
  return currentGroupByColumns.slice(0, rowDepth + 1);
}

/**
 * @description This function returns a record of the path values for the provided row node.
 */
export function getCascadeRowNodePathValueRecord<G extends GroupNode, L extends LeafNode>(
  currentGroupByColumns: string[],
  row: Row<G>
) {
  const { rowDepth, rowData } = getAdaptedTableRows<G, L>({ rowInstance: row });
  const nodePath = getCascadeRowNodePath(currentGroupByColumns, row);

  if (rowDepth === 0) {
    return { [nodePath[0]]: rowData[nodePath[0]] };
  } else {
    return nodePath.reduce((acc, columnName) => {
      acc[columnName] = rowData[columnName];
      return acc;
    }, {} as Record<string, string>);
  }
}

/**
 * @description This function generates a cache key to persist and retrieve the leaf data of a cascade row.
 */
export function getCascadeRowLeafDataCacheKey(
  nodePath: string[],
  nodePathMap: Record<string, string>,
  leafId: string
) {
  return nodePath
    .map((path) => nodePathMap[path])
    .concat(leafId)
    .join(':');
}

/**
 * Returns the leaf ID from a leaf cache key.
 */
export function getLeafIdFromCacheKey(cacheKey: string) {
  const parts = cacheKey.split(':');
  return parts[parts.length - 1];
}
