/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { groupBy } from 'lodash';
import { Accessor, AccessorFn } from '@elastic/charts';
import { DatatableRow } from '../../../../expressions/public';

export const computePercentageData = (
  rows: DatatableRow[],
  xAccessor: Accessor | AccessorFn,
  yAccessors: string[],
  splitChartAccessor?: string | null
) => {
  // Group by xAccessor
  const groupedData = groupBy(rows, function (row) {
    return row[String(xAccessor)];
  });
  // In case of small multiples, I need to group by xAccessor and splitChartAccessor
  if (splitChartAccessor) {
    for (const key in groupedData) {
      if (Object.prototype.hasOwnProperty.call(groupedData, key)) {
        const groupedBySplitData = groupBy(groupedData[key], splitChartAccessor);
        for (const newGroupKey in groupedBySplitData) {
          if (Object.prototype.hasOwnProperty.call(groupedBySplitData, newGroupKey)) {
            groupedData[`${key}-${newGroupKey}`] = groupedBySplitData[newGroupKey];
          }
        }
      }
    }
  }
  //  sum up all the yAccessors per group
  const sums: Record<string, number> = {};
  for (const key in groupedData) {
    if (Object.prototype.hasOwnProperty.call(groupedData, key)) {
      let sum = 0;
      const array = groupedData[key];
      array.forEach((row) => {
        for (const yAccessor of yAccessors) {
          sum += row[yAccessor];
        }
      });
      sums[key] = sum;
    }
  }
  //  compute the ratio of each group
  rows.forEach((row) => {
    const groupValue = splitChartAccessor
      ? `${row[String(xAccessor)]}-${row[splitChartAccessor]}`
      : row[String(xAccessor)];
    const sum = sums[groupValue] ?? 0;
    let metricsSum = 0;
    for (const yAccessor of yAccessors) {
      metricsSum += row[yAccessor];
    }
    const computedMetric = metricsSum / sum;
    for (const yAccessor of yAccessors) {
      row[yAccessor] = (computedMetric / metricsSum) * row[yAccessor];
    }
  });

  return rows;
};
