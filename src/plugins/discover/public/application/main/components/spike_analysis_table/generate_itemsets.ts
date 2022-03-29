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
  fields: string[],
  frequentItems: FrequentItems,
  changePoints: ChangePoint[],
  totalDocCount: number
) {
  // console.log('frequentItems #', frequentItems.buckets.length);

  // Filter itemsets by significant change point field value pairs
  // TODO possibly move this to the ES query
  const filteredFrequentItems = frequentItems.buckets.filter((fi) => {
    const { key: currentItems } = fi;

    return Object.entries(currentItems).every(([key, values]) => {
      return values.every((value) => {
        return changePoints.some((cp) => {
          return cp.fieldName === key && cp.fieldValue === value;
        });
      });
    });
  });

  // console.log('filteredFrequentItems #', filteredFrequentItems.length);

  // Add max p value to itemsets
  const itemsets = filteredFrequentItems.map((fi) => {
    let maxPValue = 0;
    let size = 0;

    const { key: currentItems } = fi;

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

  const itemSetTree = ItemSetTreeFactory(
    fields,
    itemsets.map((is) => {
      const { doc_count: count, maxPValue, key } = is;
      return ItemSetFactory(key as Items, maxItemCount, count, totalCount, maxPValue, minPValue);
    }),
    maxItemCount,
    totalCount,
    minPValue
  );

  return { itemsets, itemSetTree };
}
