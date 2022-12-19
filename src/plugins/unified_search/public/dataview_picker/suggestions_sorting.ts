/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Direction } from '@elastic/eui';
import { SortDirection } from '@elastic/eui';
import { DataViewListItemEnhanced } from './dataview_list';

const ALPHABETICALLY = 'alphabetically';
export type OptionsListSortBy = typeof ALPHABETICALLY;

export const DEFAULT_SORT: SortingType = { by: ALPHABETICALLY, direction: SortDirection.ASC };

export interface SortingType {
  by: OptionsListSortBy;
  direction: Direction;
}

export const getCompatibleSortingTypes = (): OptionsListSortBy[] => {
  return [ALPHABETICALLY];
};

export const getOrderDirection = (orderDirection?: Direction) => {
  return orderDirection ?? DEFAULT_SORT.direction;
};

export const handleSortingByDirection = (
  dataViews: DataViewListItemEnhanced[],
  direction: Direction
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
