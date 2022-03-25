/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isPlainObject } from 'lodash';
import { DataView } from '../../../../../data_views/public';

export type SortPairObj = Record<string, string>;
export type SortPairArr = [string, string];
export type SortPair = SortPairArr | SortPairObj;
export type SortInput = SortPair | SortPair[];

export function isSortable(fieldName: string, indexPattern: DataView): boolean {
  const field = indexPattern.getFieldByName(fieldName);
  return !!(field && field.sortable);
}

function createSortObject(sortPair: SortInput, indexPattern: DataView): SortPairObj | undefined {
  if (
    Array.isArray(sortPair) &&
    sortPair.length === 2 &&
    isSortable(String(sortPair[0]), indexPattern)
  ) {
    const [field, direction] = sortPair as SortPairArr;
    return { [field]: direction };
  } else if (isPlainObject(sortPair) && isSortable(Object.keys(sortPair)[0], indexPattern)) {
    return sortPair as SortPairObj;
  }
}

export function isLegacySort(sort: SortPair[] | SortPair): sort is SortPair {
  return (
    sort.length === 2 && typeof sort[0] === 'string' && (sort[1] === 'desc' || sort[1] === 'asc')
  );
}

/**
 * Take a sorting array and make it into an object
 * @param {array} sort two dimensional array [[fieldToSort, directionToSort]]
 *  or an array of objects [{fieldToSort: directionToSort}]
 * @param {object} indexPattern used for determining default sort
 * @returns Array<{object}> an array of sort objects
 */
export function getSort(sort: SortPair[] | SortPair, indexPattern: DataView): SortPairObj[] {
  if (Array.isArray(sort)) {
    if (isLegacySort(sort)) {
      // To stay compatible with legacy sort, which just supported a single sort field
      return [{ [sort[0]]: sort[1] }];
    }
    return sort
      .map((sortPair: SortPair) => createSortObject(sortPair, indexPattern))
      .filter((sortPairObj) => typeof sortPairObj === 'object') as SortPairObj[];
  }
  return [];
}

/**
 * compared to getSort it doesn't return an array of objects, it returns an array of arrays
 * [[fieldToSort: directionToSort]]
 */
export function getSortArray(sort: SortPair[], indexPattern: DataView): SortPairArr[] {
  return getSort(sort, indexPattern).reduce((acc: SortPairArr[], sortPair) => {
    const entries = Object.entries(sortPair);
    if (entries && entries[0]) {
      acc.push(entries[0]);
    }
    return acc;
  }, []);
}
