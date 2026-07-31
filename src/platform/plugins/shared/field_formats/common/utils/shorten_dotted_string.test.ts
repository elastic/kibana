/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shortenDottedString } from './shorten_dotted_string';

describe('shortenDottedString', () => {
  test('should convert a dot.notated.string into a short string', () => {
    expect(shortenDottedString('dot.notated.string')).toBe('d.n.string');
  });

  test('should keep single-character path segments intact', () => {
    expect(shortenDottedString('a.b.c')).toBe('a.b.c');
    expect(shortenDottedString('x.ab.c')).toBe('x.a.c');
    expect(shortenDottedString('a.b')).toBe('a.b');
    expect(shortenDottedString('no_dots')).toBe('no_dots');
  });

  test('should preserve empty segments from consecutive, leading, or trailing dots', () => {
    expect(shortenDottedString('a..b')).toBe('a..b');
    expect(shortenDottedString('.a.b')).toBe('.a.b');
    expect(shortenDottedString('a.b.')).toBe('a.b.');
    expect(shortenDottedString("abcdefg..Next time won't you sing with me?..")).toBe('a..N..');
  });

  test('should ignore non-string values', () => {
    const obj = { key: 'val' };

    expect(shortenDottedString(true)).toBe(true);
    expect(shortenDottedString(123)).toBe(123);
    expect(shortenDottedString(obj)).toBe(obj);
  });
});
