/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChangePoint, FrequentItems, Items } from './use_change_point_detection';

import { ItemSetFactory, ItemSetTreeFactory } from './itemset_tree';

export function generateItemsets(
  frequentItems: FrequentItems[],
  changePoints: ChangePoint[],
  totalDocCount: number
) {
  console.log('frequentItems', frequentItems);
  console.log('changePoints', changePoints);

  // Filter itemsets by significant change point field value pairs
  // TODO possibly move this to the ES query
  const filteredFrequentItems = frequentItems.filter((fi) => {
    let match = false;

    const { doc_count: docCount, support, ...currentItems } = fi;

    Object.entries(currentItems).forEach(([key, values]) => {
      const exists = changePoints.some((cp) => {
        return cp.fieldName === key && values.includes(`${cp.fieldValue}`);
      });

      if (exists) {
        match = true;
      }
    });

    return match;
  });

  // Add max p value to itemsets
  const itemsets = filteredFrequentItems.map((fi) => {
    let maxPValue = 0;
    let size = 0;

    const { doc_count: docCount, support, ...currentItems } = fi;

    Object.entries(currentItems).forEach(([key, values]) => {
      size = size + values.length;
      changePoints.forEach((cp) => {
        values.forEach((value) => {
          if (cp.fieldName === key && cp.fieldValue === value) {
            maxPValue = Math.max(maxPValue, cp.pValue ?? 0);
          }
        });
      });
    });

    return {
      ...fi,
      maxPValue,
      size,
      totalDocCount,
    };
  });

  // convert to tree
  let minPValue = 1.0;
  let totalCount = 0;
  let maxItemCount = 0;

  itemsets.forEach((is) => {
    minPValue = Math.min(minPValue, is.maxPValue);
    totalCount = Math.max(totalCount, is.totalDocCount);
    maxItemCount = Math.max(maxItemCount, is.size);
  });

  const tree = ItemSetTreeFactory(
    itemsets.map((is) => {
      const {
        doc_count: count,
        maxPValue,
        size,
        totalDocCount: itemSetTotalDocCount,
        support,
        ...items
      } = is;
      return ItemSetFactory(items as Items, maxItemCount, count, totalCount, maxPValue, minPValue);
    }),
    maxItemCount,
    totalCount,
    minPValue
  );
  console.log('tree', tree);

  return tree;
}
