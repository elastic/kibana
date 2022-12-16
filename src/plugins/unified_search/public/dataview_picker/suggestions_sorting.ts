/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Direction } from '@elastic/eui';
import { DataViewListItemEnhanced } from './dataview_list';

export type OptionsListSortBy = '_key';

export const DEFAULT_SORT: SortingType = { by: '_key', direction: 'asc' };

export const sortDirections: Readonly<Direction[]> = ['asc', 'desc'] as const;

export type OptionsListOrder = 'asc' | 'desc';

export type SortDirection = typeof sortDirections[number];
export interface SortingType {
  by: OptionsListSortBy;
  direction: SortDirection;
}

export const getCompatibleSortingTypes = (): OptionsListSortBy[] => {
  return ['_key'];
};

export const hadnleAlphabeticalSorting = (
  dataViews: DataViewListItemEnhanced[],
  direction?: SortDirection
) => {
  const sortedDataViews = dataViews.sort((a, b) =>
    (a.name ?? a.title).localeCompare(b.name ?? b.title)
  );

  if (direction) {
    return direction === DEFAULT_SORT.direction ? sortedDataViews : sortedDataViews.reverse();
  }

  return sortedDataViews;
};
