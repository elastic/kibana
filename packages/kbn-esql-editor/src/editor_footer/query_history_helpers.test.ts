/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { swapArrayElements } from './query_history_helpers';

describe('query history helpers', function () {
  it('should swap 2 elements in an array', function () {
    const array = [
      {
        field: 'woof',
        name: 'woof',
        sortable: true,
      },
      {
        field: 'meow',
        name: 'meow',
        sortable: false,
      },
    ];
    expect(swapArrayElements(array, 1, 0)).toEqual([
      {
        field: 'meow',
        name: 'meow',
        sortable: false,
      },
      {
        field: 'woof',
        name: 'woof',
        sortable: true,
      },
    ]);
  });
});
