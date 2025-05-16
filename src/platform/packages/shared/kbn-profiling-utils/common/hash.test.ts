/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fnv1a64 } from './hash';

function toUint8Array(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe('FNV-1a hashing operations', () => {
  test('empty', () => {
    const input = toUint8Array('');
    const expected = 'cbf29ce484222325';

    expect(fnv1a64(input)).toEqual(expected);
  });

  test('simple', () => {
    const input = toUint8Array('hello world');
    const expected = '779a65e7023cd2e7';

    expect(fnv1a64(input)).toEqual(expected);
  });

  test('long', () => {
    const input = toUint8Array('Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch');
    const expected = '7673401f09f26b0d';

    expect(fnv1a64(input)).toEqual(expected);
  });

  test('unicode double quotation marks', () => {
    const input = toUint8Array('trace:comm = “hello”');
    const expected = '8dada3d28d75245c';

    expect(fnv1a64(input)).toEqual(expected);
  });

  test('unicode spaces', () => {
    const input = toUint8Array('trace:comm\u2000=\u2001"hello"\u3000');
    const expected = '2cdcbb43ff62f74f';

    expect(fnv1a64(input)).toEqual(expected);
  });
});
