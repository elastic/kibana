/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortNullsLast } from './utils';

describe('sortNullsLast', () => {
  const rows = [
    {
      col1: null,
    },
    {
      col1: 'meow',
    },
    {
      col1: 'woof',
    },
  ];
  test('should sort correctly in ascending order', async () => {
    const sortedRows = sortNullsLast(rows, 'asc', 'col1');
    expect(sortedRows).toStrictEqual([
      {
        col1: 'meow',
      },
      {
        col1: 'woof',
      },
      {
        col1: null,
      },
    ]);
  });

  test('should sort correctly in descending order', async () => {
    const sortedRows = sortNullsLast(rows, 'desc', 'col1');
    expect(sortedRows).toStrictEqual([
      {
        col1: 'woof',
      },
      {
        col1: 'meow',
      },
      {
        col1: null,
      },
    ]);
  });
});
