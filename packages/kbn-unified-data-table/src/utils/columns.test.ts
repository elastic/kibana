/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDisplayedColumns } from './columns';

describe('getDisplayedColumns', () => {
  test('returns default columns', async () => {
    const result = getDisplayedColumns([]);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns columns when just timefield is in state', async () => {
    const result = getDisplayedColumns(['timestamp']);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "timestamp",
      ]
    `);
  });
  test('returns columns given by argument, no fallback ', async () => {
    const result = getDisplayedColumns(['test']);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "test",
      ]
    `);
  });
  test('returns the same instance of ["_source"] over multiple calls', async () => {
    const result = getDisplayedColumns([]);
    const result2 = getDisplayedColumns([]);
    expect(result).toBe(result2);
  });
});
