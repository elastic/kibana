/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function collectBranch(leaf) {
  // walk up the branch for each parent
  function walk(item, memo) {
    // record the the depth
    const depth = item.depth - 1;

    // For buckets, we use the column name to determine what the field name is.
    // If item.rawData doesn't exist, it is a metric in which case we use the
    // value of item.name. If neither exists, we fall back to the leve for the
    // field name.
    function getFieldName(i) {
      if (i.rawData && i.rawData.column > -1) {
        const { column, table } = i.rawData;
        return table.columns[column].name;
      }
      return i.name || `level ${i.depth}`;
    }

    // Add the row to the tooltipScope.rows
    memo.unshift({
      depth: depth,
      field: getFieldName(item),
      bucket: item.name,
      metric: item.size,
      item: item,
    });

    // If the item has a parent and it's also a child then continue walking
    // up the branch
    if (item.parent && item.parent.parent) {
      return walk(item.parent, memo);
    } else {
      return memo;
    }
  }

  return walk(leaf, []);
}
