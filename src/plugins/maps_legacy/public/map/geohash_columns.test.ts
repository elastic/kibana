/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { geohashColumns } from './geohash_columns';

test('geohashColumns', () => {
  expect(geohashColumns(1)).toBe(8);
  expect(geohashColumns(2)).toBe(8 * 4);
  expect(geohashColumns(3)).toBe(8 * 4 * 8);
  expect(geohashColumns(4)).toBe(8 * 4 * 8 * 4);
});
