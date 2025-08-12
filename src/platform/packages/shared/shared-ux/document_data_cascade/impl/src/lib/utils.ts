/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../store_provider';

/**
 * @description This function returns the path of the row node in the group by hierarchy.
 */
export function getCascadeRowNodePath<G extends GroupNode>(
  currentGroupByColumns: string[],
  row: Row<G>
) {
  return currentGroupByColumns.slice(0, row.depth + 1);
}

/**
 * @description This function returns a record of the path values for the provided row node.
 */
export function getCascadeRowNodePathValueRecord<G extends GroupNode>(
  currentGroupByColumns: string[],
  row: Row<G>
) {
  const nodePath = getCascadeRowNodePath(currentGroupByColumns, row);

  if (row.depth === 0) {
    return { [nodePath[0]]: row.original[nodePath[0]] };
  } else {
    return nodePath.reduce((acc, columnName) => {
      acc[columnName] = row.original[columnName];
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
