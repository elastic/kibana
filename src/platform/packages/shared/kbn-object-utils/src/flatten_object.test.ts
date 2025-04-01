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
