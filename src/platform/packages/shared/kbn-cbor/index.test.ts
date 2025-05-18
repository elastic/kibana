/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encode, decode } from '.';

describe('KbnCbor', () => {
  it('should correctly encode and decode data', () => {
    const data = { hello: 'world', count: 123, isValid: true };

    // encoding
    const encoded = encode(data);
    expect(encoded).toBeInstanceOf(Buffer);
    expect(encoded.length).toBeGreaterThan(0);

    // decoding
    const decoded = decode(encoded);
    expect(decoded).toEqual(data);
  });

  it('should encode data to Buffer', () => {
    const data = { foo: 'bar' };

    const encoded = encode(data);
    expect(Buffer.isBuffer(encoded)).toBe(true);
  });

  it('should decode Buffer to original data', () => {
    const data = { foo: 'bar', num: 42, arr: [1, 2, 3] };

    const encoded = encode(data);
    const decoded = decode(encoded);

    expect(decoded).toEqual(data);
  });
});
