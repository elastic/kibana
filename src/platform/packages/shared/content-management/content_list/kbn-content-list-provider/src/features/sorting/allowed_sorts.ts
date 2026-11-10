/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSortingConfig, type ContentListFeatures } from '../types';
import {
  DEFAULT_INITIAL_SORT,
  DEFAULT_SORT_FIELDS,
  getSortFieldDirections,
  isSortDirection,
  type SortDirection,
  type SortField,
  type SortState,
} from './types';

/**
 * The sort directions allowed for each sortable field, keyed by field.
 */
export type SortDirectionsByField = ReadonlyMap<string, ReadonlySet<SortDirection>>;

/**
 * Builds the `field:direction` key that identifies a sort.
 * Matches the `sort` URL param format.
 */
export const getSortKey = ({ field, direction }: SortState): string => `${field}:${direction}`;

/**
 * Parses a `field:direction` key, the inverse of {@link getSortKey}.
 * Only checks the shape. Use {@link isAllowedSort} to check the sort is allowed.
 */
export const parseSortKey = (key: string): SortState | undefined => {
  const [field, direction, extra] = key.split(':');
  if (extra !== undefined || !field || !isSortDirection(direction)) {
    return undefined;
  }
  return { field, direction };
};

const toFieldSorts = (fields: SortField[]): SortState[] =>
  fields.flatMap((sortField) =>
    getSortFieldDirections(sortField).map((direction) => ({ field: sortField.field, direction }))
  );

/**
 * Gets the `(field, direction)` pairs a sorting configuration allows.
 *
 * @param sorting - The sorting configuration.
 * @returns The allowed sorts.
 */
export const getAllowedSorts = (sorting: ContentListFeatures['sorting']): SortState[] => {
  if (sorting === false) {
    return [];
  }
  if (isSortingConfig(sorting)) {
    if (sorting.fields) {
      return toFieldSorts(sorting.fields);
    }
    if (sorting.options) {
      return sorting.options.map(({ field, direction }) => ({ field, direction }));
    }
  }
  return toFieldSorts(DEFAULT_SORT_FIELDS);
};

/**
 * Gets the configured initial sort, or the default when none is configured.
 *
 * @param sorting - The sorting configuration.
 * @returns The initial sort.
 */
export const getInitialSort = (sorting: ContentListFeatures['sorting']): SortState => {
  if (isSortingConfig(sorting) && sorting.initialSort) {
    return sorting.initialSort;
  }
  return DEFAULT_INITIAL_SORT;
};

/**
 * Groups sorts by field into the lookup used to validate untrusted sorts (URL, storage).
 *
 * @param sorts - The sorts to group.
 * @returns The directions allowed for each field.
 */
export const toSortDirectionsByField = (sorts: ReadonlyArray<SortState>): SortDirectionsByField => {
  const sortDirectionsByField = new Map<string, Set<SortDirection>>();
  for (const { field, direction } of sorts) {
    const directions = sortDirectionsByField.get(field) ?? new Set<SortDirection>();
    sortDirectionsByField.set(field, directions.add(direction));
  }
  return sortDirectionsByField;
};

/**
 * Whether the exact `(field, direction)` pair is allowed.
 *
 * @param sortDirectionsByField - The directions allowed for each field.
 * @param sort - The sort to check.
 */
export const isAllowedSort = (
  sortDirectionsByField: SortDirectionsByField,
  { field, direction }: SortState
): boolean => sortDirectionsByField.get(field)?.has(direction) ?? false;
