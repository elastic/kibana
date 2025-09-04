/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenToAttributes } from './flatten_to_attributes';
import { unflattenAttributes } from './unflatten_attributes';

describe('unflattenAttributes', () => {
  it('reconstructs the original object from a flattened representation', () => {
    const original = {
      user: {
        id: 1,
        tags: ['a', 'b'],
      },
      enabled: false,
    };

    const flattened = flattenToAttributes(original);
    const unflattened = unflattenAttributes(flattened);

    expect(unflattened).toEqual(original);
  });

  it('creates arrays when numeric segments are present', () => {
    const flat = {
      'items.0.name': 'one',
      'items.1.name': 'two',
    };

    const expected = {
      items: [{ name: 'one' }, { name: 'two' }],
    };

    expect(unflattenAttributes(flat)).toEqual(expected);
  });

  it('overwrites conflicting keys in order of source keys', () => {
    const flatFirst = {
      user: 'foo',
      'user.bar': 'baz',
    };

    const flatSecond = {
      'user.bar': 'baz',
      user: 'foo',
    };

    expect(unflattenAttributes(flatFirst)).toEqual({
      user: {
        bar: 'baz',
      },
    });

    expect(unflattenAttributes(flatSecond)).toEqual({
      user: 'foo',
    });
  });
});
