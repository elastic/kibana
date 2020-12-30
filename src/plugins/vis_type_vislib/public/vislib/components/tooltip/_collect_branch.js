/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
