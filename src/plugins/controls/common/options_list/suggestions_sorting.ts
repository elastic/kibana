/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Direction } from '@elastic/eui';

export const DEFAULT_SORT: SortingType = 'docDescending';

export type SortingType = 'docDescending' | 'docAscending' | 'keyDescending' | 'keyAscending';

interface DocumentCountSort {
  _count: Direction;
}
interface AlphabeticalSort {
  _key: Direction;
}

export const OptionsListSortingTypes: {
  [key in SortingType]: DocumentCountSort | AlphabeticalSort;
} = {
  docDescending: { _count: 'desc' },
  docAscending: { _count: 'asc' },
  keyDescending: { _key: 'desc' },
  keyAscending: { _key: 'asc' },
};
