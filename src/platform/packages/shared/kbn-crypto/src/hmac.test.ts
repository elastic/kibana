/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeTokenHmac, timingSafeEqualHex } from './hmac';

describe('computeTokenHmac', () => {
  it('returns HMAC-SHA256 of the binding parts joined by |', () => {
    expect(computeTokenHmac('secret-token', 'conn-1', 'default')).toBe(
      'b9a87fef90258fe40cef92a2bcd5e55e99dbdd732d5f25c9b64b2db08b3cb12d'
    );
    expect(computeTokenHmac('tok', 'exec', 'step', '2099-01-01T00:00:00.000Z')).toBe(
      'cf951c723c1d11d24fb1916ac1304dd05887c1aa18f979561661fd9a90bd633a'
    );
  });

  it('collides when a binding part contains |', () => {
    expect(computeTokenHmac('secret-token', 'a|b', 'c')).toBe(
      computeTokenHmac('secret-token', 'a', 'b|c')
    );
  });

  it('changes when the token or any binding part changes', () => {
    const base = computeTokenHmac('secret-token', 'conn-1', 'default');
    expect(computeTokenHmac('other-token', 'conn-1', 'default')).not.toBe(base);
    expect(computeTokenHmac('secret-token', 'conn-2', 'default')).not.toBe(base);
    expect(computeTokenHmac('secret-token', 'default', 'conn-1')).not.toBe(base);
  });
});

describe('timingSafeEqualHex', () => {
  const digest = computeTokenHmac('secret-token', 'conn-1', 'default');

  it('matches the same digest regardless of hex case', () => {
    expect(timingSafeEqualHex(digest, digest)).toBe(true);
    expect(timingSafeEqualHex(digest, digest.toUpperCase())).toBe(true);
  });

  it('rejects a different digest, a different length, odd length, and non-hex', () => {
    const other = computeTokenHmac('other-token', 'conn-1', 'default');
    expect(timingSafeEqualHex(digest, other)).toBe(false);
    expect(timingSafeEqualHex(digest, digest.slice(0, -2))).toBe(false);
    expect(timingSafeEqualHex('abc', 'abc')).toBe(false);
    expect(timingSafeEqualHex('aa', 'aaGG')).toBe(false);
    expect(timingSafeEqualHex('', '')).toBe(false);
  });
});
