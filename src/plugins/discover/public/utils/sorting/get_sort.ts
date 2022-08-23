/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isPlainObject } from 'lodash';
import { DataView } from '@kbn/data-views-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { getDefaultSort } from './get_default_sort';

export type SortPairObj = Record<string, string>;
export type SortPair = SortOrder | SortPairObj;
export type SortInput = SortPair | SortPair[];

export function isSortable(fieldName: string, dataView: DataView): boolean {
  const field = dataView.getFieldByName(fieldName);
  return !!(field && field.sortable);
}

function createSortObject(sortPair: SortInput, dataView: DataView): SortPairObj | undefined {
  if (
    Array.isArray(sortPair) &&
    sortPair.length === 2 &&
    isSortable(String(sortPair[0]), dataView)
  ) {
    const [field, direction] = sortPair as SortOrder;
    return { [field]: direction };
  } else if (isPlainObject(sortPair) && isSortable(Object.keys(sortPair)[0], dataView)) {
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
 * @param {object} dataView used for determining default sort
 * @returns Array<{object}> an array of sort objects
 */
export function getSort(sort: SortPair[] | SortPair, dataView: DataView): SortPairObj[] {
  if (Array.isArray(sort)) {
    if (isLegacySort(sort)) {
      // To stay compatible with legacy sort, which just supported a single sort field
      return [{ [sort[0]]: sort[1] }];
    }
    return sort
      .map((sortPair: SortPair) => createSortObject(sortPair, dataView))
      .filter((sortPairObj) => typeof sortPairObj === 'object') as SortPairObj[];
  }
  return [];
}

/**
 * compared to getSort it doesn't return an array of objects, it returns an array of arrays
 * [[fieldToSort: directionToSort]]
 */
export function getSortArray(sort: SortInput, dataView: DataView): SortOrder[] {
  return getSort(sort, dataView).reduce((acc: SortOrder[], sortPair) => {
    const entries = Object.entries(sortPair);
    if (entries && entries[0]) {
      acc.push(entries[0]);
    }
    return acc;
  }, []);
}

/**
 * sorting for embeddable, like getSortArray,but returning a default in the case the given sort or dataView is not valid
 */
export function getSortForEmbeddable(
  sort?: SortInput,
  dataView?: DataView,
  uiSettings?: IUiSettingsClient
): SortOrder[] {
  if (!sort || !sort.length || !dataView) {
    if (!uiSettings) {
      return [];
    }
    const defaultSortOrder = uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc');
    const hidingTimeColumn = uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false);
    return getDefaultSort(dataView, defaultSortOrder, hidingTimeColumn);
  }
  return getSortArray(sort, dataView);
}
