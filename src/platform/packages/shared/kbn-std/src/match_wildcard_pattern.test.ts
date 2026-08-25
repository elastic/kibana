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
    expect(matchWildcardPattern({ pattern: 'f😊*', str: 'f😊bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '*😊', str: 'foo😊' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '*😊*', str: 'foo😊bar' })).toBe(true);
  });

  it('matches patterns with only wildcards (multiple *)', () => {
    expect(matchWildcardPattern({ pattern: '**', str: 'foo' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '***', str: '' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '**', str: ' ' })).toBe(true);
  });

  it('matches patterns with empty segments between wildcards', () => {
    expect(matchWildcardPattern({ pattern: 'foo**bar', str: 'foobazbar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo**bar', str: 'foobar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo***bar', str: 'foobarbaz' })).toBe(false);
  });

  it('returns false if not enough space for last part after previous matches', () => {
    expect(matchWildcardPattern({ pattern: 'a*ab', str: 'aab' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'a*ab', str: 'ab' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'a*bc', str: 'abbbc' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'a*bcd', str: 'abbbc' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'a*bbb*bc', str: 'abbbc' })).toBe(false);
  });

  it('matches patterns with special characters and no wildcards', () => {
    expect(matchWildcardPattern({ pattern: 'foo.bar', str: 'foo.bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo.bar', str: 'foobar' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'foo[bar]', str: 'foo[bar]' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo[bar]', str: 'foobar' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'foo(test)', str: 'foo(test)' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo(test)', str: 'footest' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'foo+bar', str: 'foo+bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo+bar', str: 'foobar' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'foo?bar', str: 'foo?bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo?bar', str: 'foobar' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'foo{2}bar', str: 'foo{2}bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo{2}bar', str: 'foobar' })).toBe(false);

    expect(matchWildcardPattern({ pattern: '^start', str: '^start' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '^start', str: 'start' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'end$', str: 'end$' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'end$', str: 'end' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'foo\\bar', str: 'foo\\bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo\\bar', str: 'foo/bar' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'path\\to\\file', str: 'path\\to\\file' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'path\\to\\file', str: 'path/to/file' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'foo|bar', str: 'foo|bar' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo|bar', str: 'foo' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'foo|bar', str: 'bar' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'foo.bar+baz?', str: 'foo.bar+baz?' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'foo.bar+baz?', str: 'foobarbaz' })).toBe(false);
    expect(matchWildcardPattern({ pattern: '[test](value)', str: '[test](value)' })).toBe(true);
    expect(matchWildcardPattern({ pattern: '[test](value)', str: 'testvalue' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'hello world!', str: 'hello world!' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'hello world!', str: 'hello world' })).toBe(false);
    expect(matchWildcardPattern({ pattern: 'test@email.com', str: 'test@email.com' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'test@email.com', str: 'testemail.com' })).toBe(false);

    expect(matchWildcardPattern({ pattern: 'price: $19.99', str: 'price: $19.99' })).toBe(true);
    expect(matchWildcardPattern({ pattern: 'price: $19.99', str: 'price: 19.99' })).toBe(false);
    expect(
      matchWildcardPattern({ pattern: 'C:\\Program Files\\', str: 'C:\\Program Files\\' })
    ).toBe(true);
    expect(matchWildcardPattern({ pattern: 'C:\\Program Files\\', str: 'C:/Program Files/' })).toBe(
      false
    );
  });
});
