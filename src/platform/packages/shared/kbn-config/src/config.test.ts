/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasConfigPathIntersection } from './config';

describe('hasConfigPathIntersection()', () => {
  test('Should return true if leaf is descendent to the root', () => {
    expect(hasConfigPathIntersection('a.b', 'a.b')).toBe(true);
    expect(hasConfigPathIntersection('a.b.c', 'a')).toBe(true);
    expect(hasConfigPathIntersection('a.b.c.d', 'a.b')).toBe(true);
  });
  test('Should return false if leaf is not descendent to the root', () => {
    expect(hasConfigPathIntersection('a.bc', 'a.b')).toBe(false);
    expect(hasConfigPathIntersection('a', 'a.b')).toBe(false);
  });
  test('Should throw if either path is empty', () => {
    expect(() => hasConfigPathIntersection('a', '')).toThrow();
    expect(() => hasConfigPathIntersection('', 'a')).toThrow();
    expect(() => hasConfigPathIntersection('', '')).toThrow();
  });
});
