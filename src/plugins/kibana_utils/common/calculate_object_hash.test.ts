/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateObjectHash } from './calculate_object_hash';

describe('calculateObjectHash', () => {
  test('calculates hash of the object', () => {
    const object = { test: 123 };

    expect(calculateObjectHash(object)).toEqual('5094c3dc');
  });

  test('ignore inner props of index object expect for the value.id', () => {
    const object1 = { test: 123, index: { value: { id: 'test', otherprop: 1 } } };
    const object2 = { test: 123, index: { value: { id: 'test', otherprop: 2 } } };

    expect(calculateObjectHash(object1)).toEqual(calculateObjectHash(object2));
  });
});
