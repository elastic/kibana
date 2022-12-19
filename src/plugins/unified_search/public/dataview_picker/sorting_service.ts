/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Direction, SortDirection } from '@elastic/eui';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

const storageKey = 'unified_search_sorting';
const ALPHABETICALLY = 'alphabetically';

export interface Sorting {
  by: typeof ALPHABETICALLY;
  direction: Direction;
}

export class SortingService {
  constructor(private storage: IStorageWrapper) {}

  getSorting(): Sorting {
    let parsedSorting: Sorting | undefined;

    try {
      parsedSorting = this.storage.get(storageKey);
    } catch (e) {
      parsedSorting = undefined;
    }

    return parsedSorting ?? { by: ALPHABETICALLY, direction: SortDirection.ASC };
  }

  setSorting(data: Sorting) {
    this.storage.set(storageKey, data);
  }

  getColums(): Array<Sorting['by']> {
    return [ALPHABETICALLY];
  }
}
