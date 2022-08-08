/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calcFieldCounts } from './calc_field_counts';
import { dataViewMock } from '../../../__mocks__/data_view';
import { buildDataTableRecord } from '../../../utils/build_data_record';

describe('calcFieldCounts', () => {
  test('returns valid field count data', async () => {
    const rows = [
      { _id: '1', _index: 'test', _source: { message: 'test1', bytes: 20 } },
      { _id: '2', _index: 'test', _source: { name: 'test2', extension: 'jpg' } },
    ].map((row) => buildDataTableRecord(row));
    const result = calcFieldCounts(rows, dataViewMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "bytes": 1,
        "extension": 1,
        "message": 1,
        "name": 1,
      }
    `);
  });
  test('updates field count data', async () => {
    const rows = [
      { _id: '1', _index: 'test', _source: { message: 'test1', bytes: 20 } },
      { _id: '2', _index: 'test', _source: { name: 'test2', extension: 'jpg' } },
    ].map((row) => buildDataTableRecord(row));
    const result = calcFieldCounts(rows, dataViewMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "bytes": 1,
        "extension": 1,
        "message": 1,
        "name": 1,
      }
    `);
  });
});
