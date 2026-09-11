/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { sort } from './sort';
import { getAlphabeticalComparable } from './dataview_list';

describe('sort', () => {
  let storage: IStorageWrapper;
  beforeEach(() => {
    storage = new Storage(new StubBrowserStorage());
  });

  it('should sort DataViews alphabetically', () => {
    const notSortedlist = [
      {
        id: 'dataview-2',
        title: 'dataview-2',
      },
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
    ];

    const Sortedlist = [
      {
        id: 'dataview-1',
        title: 'dataview-1',
      },
      {
        id: 'dataview-2',
        title: 'dataview-2',
      },
    ];

    const { direction } = sort.load(storage);

    expect(sort.sortData(notSortedlist, direction, getAlphabeticalComparable)).toEqual(Sortedlist);
  });
});
