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

import _ from 'lodash';
import { IndexPattern } from '../../../../../../data/public';

export type SortPairObj = Record<string, string>;
export type SortPairArr = [string, string];
export type SortPair = SortPairArr | SortPairObj;
export type SortInput = SortPair | SortPair[];

export function isSortable(fieldName: string, indexPattern: IndexPattern) {
  const field = indexPattern.getFieldByName(fieldName);
  return field && field.sortable;
}

function createSortObject(
  sortPair: SortInput,
  indexPattern: IndexPattern
): SortPairObj | undefined {
  if (
    Array.isArray(sortPair) &&
    sortPair.length === 2 &&
    isSortable(String(sortPair[0]), indexPattern)
  ) {
    const [field, direction] = sortPair as SortPairArr;
    return { [field]: direction };
  } else if (_.isPlainObject(sortPair) && isSortable(Object.keys(sortPair)[0], indexPattern)) {
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
export function getSort(sort: SortPair[] | SortPair, indexPattern: IndexPattern): SortPairObj[] {
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
export function getSortArray(sort: SortPair[], indexPattern: IndexPattern): SortPairArr[] {
  return getSort(sort, indexPattern).reduce((acc: SortPairArr[], sortPair) => {
    const entries = Object.entries(sortPair);
    if (entries && entries[0]) {
      acc.push(entries[0]);
    }
    return acc;
  }, []);
}
