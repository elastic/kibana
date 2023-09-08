/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { getDisplayedColumns } from './columns';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

describe('getDisplayedColumns', () => {
  test('returns default columns given a data view without timefield', async () => {
    const result = getDisplayedColumns([], dataViewMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns default columns given a data view with timefield', async () => {
    const result = getDisplayedColumns([], dataViewWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns default columns when just timefield is in state', async () => {
    const result = getDisplayedColumns(['timestamp'], dataViewWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns columns given by argument, no fallback ', async () => {
    const result = getDisplayedColumns(['test'], dataViewWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "test",
      ]
    `);
  });
  test('returns the same instance of ["_source"] over multiple calls', async () => {
    const result = getDisplayedColumns([], dataViewWithTimefieldMock);
    const result2 = getDisplayedColumns([], dataViewWithTimefieldMock);
    expect(result).toBe(result2);
  });
});
