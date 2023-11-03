/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pathsIntersect } from './resolve_helpers';

describe('pathsIntersect', () => {
  test.each([
    ['*', '*', true],
    ['foo.*', '*', true],
    ['bar', '*', true],
    ['foo.bar', '*', true],
    ['foo.bar', 'foo.*', true],
    ['foo', 'bar', false],
    ['foo.*', 'bar.*', false],
    ['foo.bar', 'bar.*', false],
    ['common.foo', 'common.bar', false],
    ['common.foo.*', 'common.bar.*', false],
  ])('%p and %p returns %p', (pathA, pathB, expected) => {
    expect(pathsIntersect(pathA, pathB)).toBe(expected);
    expect(pathsIntersect(pathB, pathA)).toBe(expected);
  });
});
