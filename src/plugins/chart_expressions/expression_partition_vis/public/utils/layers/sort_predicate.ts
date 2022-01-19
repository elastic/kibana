/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ArrayEntry } from '@elastic/charts';
import { Datatable } from '../../../../../../../src/plugins/expressions';
import {
  BucketColumns,
  ChartTypes,
  PartitionVisParams,
  SplitDimensionParams,
} from '../../../common/types';

type SortFn = (([name1, node1]: ArrayEntry, [name2, node2]: ArrayEntry) => number) | undefined;

type SortPredicateMosaicFn = (visData: Datatable, columns: Array<Partial<BucketColumns>>) => SortFn;

type SortPredicatePieDonutFn = (
  visParams: PartitionVisParams,
  currentColumn: Partial<BucketColumns>
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

const sortWithRespectToSourceOrder =
  (currentColumn: Partial<BucketColumns>) =>
  ([name1, node1]: ArrayEntry, [name2, node2]: ArrayEntry) => {
    const params = currentColumn.meta?.sourceParams?.params as SplitDimensionParams | undefined;
    const sort: string | undefined = params?.orderBy;
    // unconditionally put "Other" to the end (as the "Other" slice may be larger than a regular slice, yet should be at the end)
    if (name1 === '__other__' && name2 !== '__other__') return 1;
    if (name2 === '__other__' && name1 !== '__other__') return -1;
    // metric sorting
    if (sort && sort !== '_key') {
      if (params?.order === 'desc') {
        return node2.value - node1.value;
      } else {
        return node1.value - node2.value;
      }
      // alphabetical sorting
    } else {
      if (name1 > name2) {
        return params?.order === 'desc' ? -1 : 1;
      }
      if (name2 > name1) {
        return params?.order === 'desc' ? 1 : -1;
      }
    }
    return 0;
  };

const sortPredicatePieDonut: SortPredicatePieDonutFn = (visParams, ...args) =>
  visParams.respectSourceOrder ? sortWithRespectToSourceOrder(...args) : undefined;

const sortPredicateMosaic: SortPredicateMosaicFn = (visData, columns) => {
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
  columns: Array<Partial<BucketColumns>>,
  currentColumn: Partial<BucketColumns>
) =>
  ({
    [ChartTypes.PIE]: () => sortPredicatePieDonut(visParams, currentColumn),
    [ChartTypes.DONUT]: () => sortPredicatePieDonut(visParams, currentColumn),
    [ChartTypes.WAFFLE]: () => sortPredicateWaffle(),
    [ChartTypes.TREEMAP]: () => undefined,
    [ChartTypes.MOSAIC]: () => sortPredicateMosaic(visData, columns),
  }[chartType]());
