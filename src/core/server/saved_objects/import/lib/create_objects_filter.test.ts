/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createObjectsFilter } from './create_objects_filter';

describe('createObjectsFilter()', () => {
  test('filter should return false when contains empty parameters', () => {
    const fn = createObjectsFilter([]);
    expect(fn({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(false);
  });

  test('filter should return true for objects that are being retried', () => {
    const fn = createObjectsFilter([
      {
        type: 'a',
        id: '1',
        overwrite: false,
        replaceReferences: [],
      },
    ]);
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [],
      })
    ).toEqual(true);
  });

  test(`filter should return false for objects that aren't being retried`, () => {
    const fn = createObjectsFilter([
      {
        type: 'a',
        id: '1',
        overwrite: false,
        replaceReferences: [],
      },
    ]);
    expect(
      fn({
        type: 'b',
        id: '1',
        attributes: {},
        references: [],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [],
      })
    ).toEqual(false);
  });
});
