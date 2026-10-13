/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readLocalStorage, writeLocalStorage } from '../../storage/local_storage';
import type { ContentListFeatures } from '../types';
import {
  getAllowedSorts,
  getSortKey,
  isAllowedSort,
  parseSortKey,
  toSortDirectionsByField,
} from './allowed_sorts';
import type { SortState } from './types';

const STORAGE_KEY_PREFIX_SORT = 'sort:';

/**
 * Read the persisted sort from `localStorage`.
 *
 * The stored value is ignored when it is malformed or no longer allowed by the
 * sorting configuration (for example, a field that was removed).
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param sorting - The sorting configuration the stored sort must be allowed by.
 * @returns The persisted sort, or `undefined` if none is stored or it is not allowed.
 */
export const getPersistedSort = (
  key: string,
  sorting: ContentListFeatures['sorting']
): SortState | undefined => {
  const raw = readLocalStorage(`${STORAGE_KEY_PREFIX_SORT}${key}`);
  if (raw === null) {
    return undefined;
  }

  const sort = parseSortKey(raw);
  return sort && isAllowedSort(toSortDirectionsByField(getAllowedSorts(sorting)), sort)
    ? sort
    : undefined;
};

/**
 * Write the sort to `localStorage`.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param sort - Sort to persist.
 */
export const setPersistedSort = (key: string, sort: SortState): void => {
  writeLocalStorage(`${STORAGE_KEY_PREFIX_SORT}${key}`, getSortKey(sort));
};
