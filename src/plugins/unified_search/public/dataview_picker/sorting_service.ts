/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Direction, SortDirection } from '@elastic/eui';
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';

export interface DataViewListItemEnhanced extends DataViewListItem {
  isAdhoc?: boolean;
}

const storageKey = 'unified_search_sorting';
export const ALPHABETICALLY = 'alphabetically';

export interface Sorting {
  column: typeof ALPHABETICALLY;
  direction: Direction;
}

export class SortingService<T = unknown> {
  private storage = new Storage(window.localStorage);
  public column: Sorting['column'];
  public direction: Sorting['direction'];

  constructor(private callbacks: Record<Sorting['column'], (arg: T) => string>) {
    const { column, direction } = this.getSorting();
    this.column = column;
    this.direction = direction;
  }

  private getSorting(): Sorting {
    let parsedSorting: Sorting | undefined;

    try {
      parsedSorting = this.storage.get(storageKey);
    } catch (e) {
      parsedSorting = undefined;
    }

    return parsedSorting ?? { column: ALPHABETICALLY, direction: SortDirection.ASC };
  }

  setDirection(direction: Sorting['direction']) {
    this.direction = direction;
    this.storage.set(storageKey, { direction, column: this.column });
  }

  setColumn(column: Sorting['column']) {
    this.column = column;
    this.storage.set(storageKey, { column, direction: this.direction });
  }

  getOrderDirections(): Array<Sorting['direction']> {
    return [SortDirection.ASC, SortDirection.DESC];
  }

  getColums(): Array<Sorting['column']> {
    return [ALPHABETICALLY];
  }

  sortData(data: T[]) {
    const compare = (a: string, b: string) => a.localeCompare(b);

    return data.sort((a, b) => {
      const firstComparableField = this.callbacks[this.column](a);
      const secondComparableField = this.callbacks[this.column](b);

      if (this.direction === SortDirection.ASC) {
        return compare(firstComparableField, secondComparableField);
      } else {
        return compare(secondComparableField, firstComparableField);
      }
    });
  }
}
