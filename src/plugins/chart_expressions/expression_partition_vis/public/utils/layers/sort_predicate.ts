/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ArrayEntry } from '@elastic/charts';
import { Datatable } from '../../../../../../../src/plugins/expressions';
import { BucketColumns, ChartTypes, PartitionVisParams } from '../../../common/types';

type SortFn = (([name1, node1]: ArrayEntry, [name2, node2]: ArrayEntry) => number) | undefined;

type SortPredicateDefaultFn = (
  visData: Datatable,
  columns: Array<Partial<BucketColumns>>
) => SortFn;

type SortPredicatePieDonutFn = (
  visParams: PartitionVisParams,
  visData: Datatable,
  columns: Array<Partial<BucketColumns>>
) => SortFn;

type SortPredicateWaffleFn = () => SortFn;

export const extractUniqTermsMap = (dataTable: Datatable, columnId: string) =>
  [...new Set(dataTable.rows.map((item) => item[columnId]))].reduce(
    (acc, item, index) => ({
      ...acc,
      [item]: index,
    }),
    {}
  );

const sortPredicatePieDonut: SortPredicatePieDonutFn = (visParams, ...args) =>
  visParams.respectSourceOrder ? sortPredicateDefault(...args) : undefined;

const sortPredicateDefault: SortPredicateDefaultFn = (visData, columns) => {
  const sortingMap = columns[0]?.id ? extractUniqTermsMap(visData, columns[0].id) : {};
  return ([name1, node1], [, node2]) => {
    // Sorting for first group
    if (columns.length === 1 || (node1.children.length && name1 in sortingMap)) {
      return sortingMap[name1];
    }
    // Sorting for second group
    return node2.value - node1.value;
  };
};

const sortPredicateWaffle: SortPredicateWaffleFn =
  () =>
  ([, node1], [, node2]) =>
    node2.value - node1.value;

export const sortPredicateByType = (
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  visData: Datatable,
  columns: Array<Partial<BucketColumns>>
) =>
  ({
    [ChartTypes.PIE]: () => sortPredicatePieDonut(visParams, visData, columns),
    [ChartTypes.DONUT]: () => sortPredicatePieDonut(visParams, visData, columns),
    [ChartTypes.WAFFLE]: () => sortPredicateWaffle(),
    [ChartTypes.TREEMAP]: () => undefined,
    [ChartTypes.MOSAIC]: () => sortPredicateDefault(visData, columns),
  }[chartType]());
