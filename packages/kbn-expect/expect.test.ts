/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// importing this package's expect as `kbnExpect` to not conflict with Jest's expect
import kbnExpect from './expect';

it('asserts that sets with same entries but different ordering are equal', async () => {
  const setA = new Set(['a', 'b', 'c']);
  const setB = new Set(['c', 'b', 'a']);

  expect(() => {
    kbnExpect(setA).to.eql(setB);
  }).not.toThrow();
  expect(() => {
    kbnExpect(setB).to.eql(setA);
  }).not.toThrow();
});

it('asserts that sets with same size but different entries are not equal', async () => {
  const setA = new Set(['a', 'b', 'c']);
  const setB = new Set(['x', 'y', 'z']);

  expect(() => {
    kbnExpect(setA).to.eql(setB);
  }).toThrow();
  expect(() => {
    kbnExpect(setB).to.eql(setA);
  }).toThrow();
});

it('asserts that sets with different size but overlapping items are not equal', async () => {
  const setA = new Set(['a', 'b', 'c']);
  const setB = new Set(['a', 'b']);

  expect(() => {
    kbnExpect(setA).to.eql(setB);
  }).toThrow();
  expect(() => {
    kbnExpect(setB).to.eql(setA);
  }).toThrow();
});
