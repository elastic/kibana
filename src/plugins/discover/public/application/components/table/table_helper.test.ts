/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { arrayContainsObjects } from './table_helper';

describe('arrayContainsObjects', () => {
  it(`returns false for an array of primitives`, () => {
    const actual = arrayContainsObjects(['test', 'test']);
    expect(actual).toBeFalsy();
  });

  it(`returns true for an array of objects`, () => {
    const actual = arrayContainsObjects([{}, {}]);
    expect(actual).toBeTruthy();
  });

  it(`returns true for an array of objects and primitves`, () => {
    const actual = arrayContainsObjects([{}, 'sdf']);
    expect(actual).toBeTruthy();
  });

  it(`returns false for an array of null values`, () => {
    const actual = arrayContainsObjects([null, null]);
    expect(actual).toBeFalsy();
  });

  it(`returns false if no array is given`, () => {
    const actual = arrayContainsObjects([null, null]);
    expect(actual).toBeFalsy();
  });
});
