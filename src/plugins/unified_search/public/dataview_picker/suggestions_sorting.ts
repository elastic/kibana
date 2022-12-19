/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewListItemEnhanced } from './dataview_list';

export type OptionsListSortBy = 'alphabetically';

export const DEFAULT_SORT: SortingType = { by: 'alphabetically', direction: 'asc' };

export type OptionsListOrder = 'asc' | 'desc';

export interface SortingType {
  by: OptionsListSortBy;
  direction: OptionsListOrder;
}

export const getCompatibleSortingTypes = (): OptionsListSortBy[] => {
  return ['alphabetically'];
};

export const getCompatibleSortingTypesByOrder = (): OptionsListOrder[] => ['asc', 'desc'];

export const hadnleAlphabeticalSorting = (
  dataViews: DataViewListItemEnhanced[],
  direction?: OptionsListOrder
) => {
  const compare = (a: string, b: string) => a.localeCompare(b);

  return dataViews.sort((a, b) => {
    const firstComparableField = a.name ?? a.title;
    const secondComparableField = b.name ?? b.title;

    if (direction === DEFAULT_SORT.direction) {
      return compare(firstComparableField, secondComparableField);
    } else {
      return compare(secondComparableField, firstComparableField);
    }
  });
};
