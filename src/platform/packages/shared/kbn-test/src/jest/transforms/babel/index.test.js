/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import transformer from '.';

// Minimal transformOptions passed to getCacheKey. Jest provides a large object,
// but for our purposes we only need rootDir and a couple of transform fields
// that are accounted for in the transformer cache key computation.
function makeTransformOptions(rootDir) {
  return {
    config: {
      rootDir,
      // Match shape used by serializeJestTransformBits
      transform: {},
      transformIgnorePatterns: [],
    },
  };
}

describe('transformer cache key', () => {
  const rootDir = process.cwd();

  it('cache key: returns stable 32-char hex and varies with inputs', () => {
    const opts = makeTransformOptions(rootDir);

    const k1 = transformer.getCacheKey('console.log("a")', __filename, opts);
    expect(typeof k1).toBe('string');
    expect(k1).toHaveLength(32);
    expect(/^[a-f0-9]+$/.test(k1)).toBe(true);

    const k2 = transformer.getCacheKey('console.log("b")', __filename, opts);
    expect(k2).not.toBe(k1);

    const fakePath = path.join(rootDir, 'some', 'virtual', 'file.ts');
    const k3 = transformer.getCacheKey('console.log("a")', fakePath, opts);
    expect(k3).not.toBe(k1);

    // Same inputs produce the same key
    const k1b = transformer.getCacheKey('console.log("a")', __filename, opts);
    expect(k1b).toBe(k1);
  });
});
