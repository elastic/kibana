/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { par, dpar, list } from '../nodes';

test('can construct a param', () => {
  const node1 = par('my_param');
  const node2 = par('?my_param');

  expect(node1.paramKind).toBe('?');
  expect(node2.paramKind).toBe('?');

  expect(node1 + '').toBe('?my_param');
  expect(node2 + '').toBe('?my_param');
});

test('can construct a double param', () => {
  const node = par('??my_param');

  expect(node.paramKind).toBe('??');

  expect(node + '').toBe('??my_param');
});

test('can construct a double param using dpar() method', () => {
  const node = dpar('my_param');

  expect(node.paramKind).toBe('??');

  expect(node + '').toBe('??my_param');
});

describe('list', () => {
  test('can construct an integer list', () => {
    const node = list([1, 2, 3]);

    expect(node.type).toBe('list');
    expect(node + '').toBe('[1, 2, 3]');
  });

  test('can construct a string list', () => {
    const node = list(['a', 'b', 'c']);

    expect(node.type).toBe('list');
    expect(node + '').toBe('["a", "b", "c"]');
  });

  test('can construct a boolean list', () => {
    const node = list([true, false, true]);

    expect(node.type).toBe('list');
    expect(node + '').toBe('[TRUE, FALSE, TRUE]');
  });

  test('throws on empty list', () => {
    expect(() => list([])).toThrow('Cannot create an empty list literal');
  });

  test('throws on mixed types', () => {
    expect(() => list([1, 'a', 2] as unknown as number[])).toThrow(
      'All list elements must be of the same type. Expected "number", but found "string" at index 1'
    );
  });
});
