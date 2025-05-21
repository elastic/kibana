/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { matchWildcardPattern } from './match_wildcard_pattern';

describe('matchWildcardPattern', () => {
  it('matches exact string without wildcard', () => {
    expect(matchWildcardPattern({ pattern: 'foo', str: 'foo' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo', str: 'bar' })).toBe(false);
  });

  it('matches with single wildcard at end', () => {
    expect(matchWildcardPattern({ pattern: 'foo*', str: 'foobar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo*', str: 'foo' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo*', str: 'fo' })).toBe(false);
  });

  it('matches with single wildcard at start', () => {
    expect(matchWildcardPattern({ pattern: '*bar', str: 'foobar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '*bar', str: 'bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '*bar', str: 'ba' })).toBe(false);
  });

  it('matches with wildcard in the middle', () => {
    expect(matchWildcardPattern({ pattern: 'f*o', str: 'foo' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*o', str: 'f123o' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*o', str: 'fo' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*o', str: 'f' })).toBe(false);
  });

  it('matches with multiple wildcards', () => {
    expect(matchWildcardPattern({ pattern: 'f*b*r', str: 'foobar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*b*r', str: 'fbr' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*b*r', str: 'far' })).toBe(false);
  });

  it('matches empty pattern and string', () => {
    expect(matchWildcardPattern({ pattern: '', str: '' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '', str: 'foo' })).toBe(false);
    expect(matchWildcardPattern({ pattern: '*', str: '' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '*', str: 'foo' })).toBe(true);
  });

  it('is case insensitive', () => {
    expect(matchWildcardPattern({ pattern: 'FOO*', str: 'foobar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo*', str: 'FOOBAR' })).toBe(true);
  });

  it('escapes special regex characters in pattern', () => {
    expect(matchWildcardPattern({ pattern: 'foo.bar*', str: 'foo.bar123' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo.bar*', str: 'foobar123' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'foo?bar*', str: 'foo?bar123' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo+bar*', str: 'foo+bar123' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo(bar)*', str: 'foo(bar)baz' })).toBe(true);
  });

  it('handles patterns with consecutive wildcards', () => {
    expect(matchWildcardPattern({ pattern: 'foo**bar', str: 'foobazbar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo**bar', str: 'foobar' })).toBe(true);
  });

  it('handles only wildcard pattern', () => {
    expect(matchWildcardPattern({ pattern: '*', str: 'anything' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '*', str: '' })).toBe(true);
  });

  it('handles pattern and string with unicode characters', () => {
    expect(matchWildcardPattern({ pattern: 'f*😊', str: 'foo😊' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*😊', str: 'f😊' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'f*😊', str: 'f' })).toBe(false);
  });
});
