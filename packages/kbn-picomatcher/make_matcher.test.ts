/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeMatcher } from './make_matcher';

describe('@kbn/picomatcher makeMatcher()', () => {
  it('does positive matching', () => {
    const matcher = makeMatcher(['foo/**', 'bar/**']);

    expect(matcher('foo')).toBe(true);
    expect(matcher('foo/bar')).toBe(true);
    expect(matcher('foo/baz')).toBe(true);
    expect(matcher('bar')).toBe(true);
    expect(matcher('bar/foo')).toBe(true);
    expect(matcher('bar/baz')).toBe(true);
    expect(matcher('baz')).toBe(false);
    expect(matcher('baz/box')).toBe(false);
  });

  it('does negative matching', () => {
    const matcher = makeMatcher(['foo/**', '!foo/bar/**'], {
      ignore: ['foo/yar?/**'],
    });

    expect(matcher('foo')).toBe(true);
    expect(matcher('foo/bar')).toBe(false);
    expect(matcher('foo/bar/baz')).toBe(false);
    expect(matcher('foo/box')).toBe(true);
    expect(matcher('foo/box/baz')).toBe(true);
    expect(matcher('foo/yar')).toBe(true);
    expect(matcher('foo/yar/tya')).toBe(true);
    expect(matcher('foo/yarn/tya')).toBe(false);
  });

  it('does case-insensitive matching', () => {
    const matcher = makeMatcher(['foo/**', '!foo/bar/**'], { caseInsensitive: true });

    expect(matcher('FOO')).toBe(true);
    expect(matcher('FOO/BAR')).toBe(false);
    expect(matcher('FOO/BAR/BAZ')).toBe(false);
    expect(matcher('FOO/BOX')).toBe(true);
    expect(matcher('FOO/BOX/BAZ')).toBe(true);
    expect(matcher('FOO/YAR')).toBe(true);
    expect(matcher('FOO/YAR/TYA')).toBe(true);
  });
});
