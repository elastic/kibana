/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenObject, flattenObjectNestedLast } from './flatten_object';

describe('flattenObject', () => {
  it('should flatten nested object properties', () => {
    const flattened = flattenObject({
      alpha: {
        gamma: {
          sigma: 1,
        },
        delta: {
          sigma: 2,
        },
      },
      beta: 3,
    });

    expect(flattened).toEqual({
      'alpha.gamma.sigma': 1,
      'alpha.delta.sigma': 2,
      beta: 3,
    });
  });

  it('does not flatten an array item', () => {
    const data = {
      key1: {
        item1: 'value 1',
        item2: { itemA: 'value 2' },
      },
      key2: {
        item3: { itemA: { itemAB: 'value AB' } },
        item4: 'value 4',
        item5: [1],
        item6: { itemA: [1, 2, 3] },
      },
      key3: ['item7', 'item8'],
    };

    const flatten = flattenObject(data);
    expect(flatten).toEqual({
      key3: ['item7', 'item8'],
      'key2.item3.itemA.itemAB': 'value AB',
      'key2.item4': 'value 4',
      'key2.item5': [1],
      'key2.item6.itemA': [1, 2, 3],
      'key1.item1': 'value 1',
      'key1.item2.itemA': 'value 2',
    });
  });
});

describe('flattenObjectNestedLast', () => {
  it('should give nested object properties precedence over already flattened entries', () => {
    const flattened = flattenObjectNestedLast({
      'alpha.beta': 99,
      alpha: {
        gamma: {
          sigma: 1,
        },
        delta: {
          sigma: 2,
        },
      },
      beta: 3,
      'alpha.gamma.sigma': 4,
    });

    expect(flattened).toEqual({
      'alpha.beta': 99,
      'alpha.gamma.sigma': 1,
      'alpha.delta.sigma': 2,
      beta: 3,
    });
  });
});
