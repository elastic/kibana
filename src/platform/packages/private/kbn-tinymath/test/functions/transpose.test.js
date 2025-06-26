/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transpose } = require('../../src/functions/lib/transpose');

describe('transpose', () => {
  it('2D arrays', () => {
    expect(
      transpose(
        [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        0
      )
    ).toEqual([
      [1, 3, 5],
      [2, 4, 6],
    ]);
    expect(transpose([10, 20, [10, 20, 30, 40], 30], 2)).toEqual([
      [10, 20, 10, 30],
      [10, 20, 20, 30],
      [10, 20, 30, 30],
      [10, 20, 40, 30],
    ]);
    expect(transpose([4, [1, 9], [3, 5]], 1)).toEqual([
      [4, 1, 3],
      [4, 9, 5],
    ]);
  });

  it('array length mismatch', () => {
    expect(() => transpose([[1], [2, 3]], 0)).toThrow('Array length mismatch');
  });
});
