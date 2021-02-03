/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shortenDottedString } from './shorten_dotted_string';

describe('shortenDottedString', () => {
  test('should convert a dot.notated.string into a short string', () => {
    expect(shortenDottedString('dot.notated.string')).toBe('d.n.string');
  });

  test('should ignore non-string values', () => {
    const obj = { key: 'val' };

    expect(shortenDottedString(true)).toBe(true);
    expect(shortenDottedString(123)).toBe(123);
    expect(shortenDottedString(obj)).toBe(obj);
  });
});
