/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { par, dpar } from '../nodes';

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
