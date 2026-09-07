/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Direction } from '@elastic/eui';
import { SortDirection } from '@elastic/eui';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

const storageKey = 'unified_search_sorting';
export const ALPHABETICALLY = 'alphabetically';

export interface Sorting {
  sortingStrategyType: typeof ALPHABETICALLY;
  direction: Direction;
}

export const sort = {
  load: (storage: IStorageWrapper): Sorting => {
    let parsedSorting: Sorting | undefined;

    try {
      parsedSorting = storage.get(storageKey);
    } catch (e) {
      parsedSorting = undefined;
    }

    return {
      sortingStrategyType: parsedSorting?.sortingStrategyType || ALPHABETICALLY,
      direction: parsedSorting?.direction || SortDirection.ASC,
    };
  },
  save: (storage: IStorageWrapper, direction: Direction) => {
    storage.set(storageKey, { direction, sortingStrategyType: ALPHABETICALLY });
  },
  sortData: <T>(data: T[], direction: Direction, getComparable: (arg: T) => string) => {
    return [...data].sort((a, b) => {
      const aComparable = getComparable(a);
      const bComparable = getComparable(b);

      return direction === SortDirection.ASC
        ? aComparable.localeCompare(bComparable)
        : bComparable.localeCompare(aComparable);
    });
  },
};
