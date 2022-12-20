/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Direction, SortDirection } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';

const storageKey = 'unified_search_sorting';
export const ALPHABETICALLY = 'alphabetically';

export interface Sorting {
  column: typeof ALPHABETICALLY;
  direction: Direction;
}

export class SortingService {
  private storage = new Storage(window.localStorage);
  public column: Sorting['column'];
  public direction: Sorting['direction'];

  constructor() {
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
}
