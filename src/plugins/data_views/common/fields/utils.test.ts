/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shortenDottedString } from './utils';

describe('shortenDottedString', () => {
  test('should convert a dot.notated.string into a short string', () => {
    expect(shortenDottedString('dot.notated.string')).toBe('d.n.string');
  });

  test('should ignore non-string values', () => {
    const obj = { key: 'val' };

    expect(shortenDottedString(true as unknown as string)).toBe(true);
    expect(shortenDottedString(123 as unknown as string)).toBe(123);
    expect(shortenDottedString(obj as unknown as string)).toBe(obj);
  });
});
