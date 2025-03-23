/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commonBasePath } from './run';

describe('commonBasePath', () => {
  it('returns a common path', () => {
    expect(commonBasePath(['foo/bar/baz', 'foo/bar/quux', 'foo/bar'])).toBe('foo/bar');
  });

  it('handles an empty array', () => {
    expect(commonBasePath([])).toBe('');
  });

  it('handles no common path', () => {
    expect(commonBasePath(['foo', 'bar'])).toBe('');
  });

  it('matches full paths', () => {
    expect(commonBasePath(['foo/bar', 'foo/bar_baz'])).toBe('foo');
  });
});
