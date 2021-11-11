/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDisplayedColumns } from './columns';
import { indexPatternWithTimefieldMock } from '../__mocks__/index_pattern_with_timefield';
import { indexPatternMock } from '../__mocks__/index_pattern';

describe('getDisplayedColumns', () => {
  test('returns default columns given a index pattern without timefield', async () => {
    const result = getDisplayedColumns([], indexPatternMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns default columns given a index pattern with timefield', async () => {
    const result = getDisplayedColumns([], indexPatternWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns default columns when just timefield is in state', async () => {
    const result = getDisplayedColumns(['timestamp'], indexPatternWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns columns given by argument, no fallback ', async () => {
    const result = getDisplayedColumns(['test'], indexPatternWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "test",
      ]
    `);
  });
  test('returns the same instance of ["_source"] over multiple calls', async () => {
    const result = getDisplayedColumns([], indexPatternWithTimefieldMock);
    const result2 = getDisplayedColumns([], indexPatternWithTimefieldMock);
    expect(result).toBe(result2);
  });
});
