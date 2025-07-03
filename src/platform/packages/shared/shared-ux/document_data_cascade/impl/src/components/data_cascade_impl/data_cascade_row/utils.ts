/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../../data_cascade_provider';

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
 * @description This function returns a record of the path values for the row node.
 */
export function getCascadeRowNodePathValueRecord<G extends GroupNode>(
  currentGroupByColumns: string[],
  row: Row<G>
) {
  const nodePath = getCascadeRowNodePath(currentGroupByColumns, row);

  return row.getParentRows().reduce((acc, parentRow) => {
    // TODO: This assumes that the parentRow.original.group is the value you want to use for the path.
    // provide means to adjust this logic if user's data structure is different.
    acc[nodePath[parentRow.depth]] = parentRow.original.group;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * @description This function generates a cache key for the leaf data of a cascade row.
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
