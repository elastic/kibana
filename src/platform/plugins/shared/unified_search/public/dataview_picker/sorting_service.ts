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
import { Storage } from '@kbn/kibana-utils-plugin/public';

const storageKey = 'unified_search_sorting';
export const ALPHABETICALLY = 'alphabetically';

export interface Sorting {
  sortingStrategyType: typeof ALPHABETICALLY;
  direction: Direction;
}

export class SortingService<T = unknown> {
  public sortingStrategyType: Sorting['sortingStrategyType'];
  public direction: Sorting['direction'];

  constructor(
    private sortingStrategies: Record<Sorting['sortingStrategyType'], (arg: T) => string>,
    private storage: IStorageWrapper = new Storage(window.localStorage)
  ) {
    const { sortingStrategyType, direction } = this.getSorting();
    this.sortingStrategyType = sortingStrategyType;
    this.direction = direction;
  }

  private getSorting(): Sorting {
    let parsedSorting: Sorting | undefined;

    try {
      parsedSorting = this.storage.get(storageKey);
    } catch (e) {
      parsedSorting = undefined;
    }

    return {
      sortingStrategyType: parsedSorting?.sortingStrategyType || ALPHABETICALLY,
      direction: parsedSorting?.direction || SortDirection.ASC,
    };
  }

  setDirection(direction: Sorting['direction']) {
    this.direction = direction;
    this.storage.set(storageKey, { direction, sortingStrategyType: this.sortingStrategyType });
  }

  setSortingStrategyType(sortingStrategyType: Sorting['sortingStrategyType']) {
    this.sortingStrategyType = sortingStrategyType;
    this.storage.set(storageKey, { sortingStrategyType, direction: this.direction });
  }

  getOrderDirections(): Array<Sorting['direction']> {
    return [SortDirection.ASC, SortDirection.DESC];
  }

  getSortingStrategyTypes(): Array<Sorting['sortingStrategyType']> {
    return [ALPHABETICALLY];
  }

  sortData(data: T[]) {
    return [...data].sort((a, b) => {
      const fn = this.sortingStrategies[this.sortingStrategyType];
      const firstComparableField = fn(a);
      const secondComparableField = fn(b);

      return this.compare(firstComparableField, secondComparableField);
    });
  }

  private compare(a: string, b: string) {
    if (this.direction === SortDirection.ASC) {
      return a.localeCompare(b);
    }
    return b.localeCompare(a);
  }
}
