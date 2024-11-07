/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flat, flatMap, id } from '../utils';

describe(`util functions`, () => {
  const nested = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  const flattened = [1, 2, 3, 4, 5, 6];
  describe(`flat`, () => {
    it(`should be a fn`, () => {
      expect(typeof flat).toBe('function');
    });
    it(`should flatten and map (transform)`, () => {
      expect(flat(nested)).toEqual(flattened);
    });
  });
  describe(`flatMap`, () => {
    it(`should be a fn`, () => {
      expect(typeof flatMap).toBe('function');
    });
    it(`should flatten and map (transform)`, () => {
      expect(flatMap(id)(nested)).toEqual(flattened);
    });
  });
});
