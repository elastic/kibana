/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { calcFieldCounts } from './calc_field_counts';
import { indexPatternMock } from '../../__mocks__/index_pattern';

describe('calcFieldCounts', () => {
  test('returns valid field count data', async () => {
    const rows = [
      { _id: 1, _source: { message: 'test1', bytes: 20 } },
      { _id: 2, _source: { name: 'test2', extension: 'jpg' } },
    ];
    const result = calcFieldCounts({}, rows, indexPatternMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_index": 2,
        "_score": 2,
        "bytes": 1,
        "extension": 1,
        "message": 1,
        "name": 1,
      }
    `);
  });
  test('updates field count data', async () => {
    const rows = [
      { _id: 1, _source: { message: 'test1', bytes: 20 } },
      { _id: 2, _source: { name: 'test2', extension: 'jpg' } },
    ];
    const result = calcFieldCounts({ message: 2 }, rows, indexPatternMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_index": 2,
        "_score": 2,
        "bytes": 1,
        "extension": 1,
        "message": 3,
        "name": 1,
      }
    `);
  });
});
