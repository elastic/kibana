/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fnv1a32 } from './hash';

describe('fnv-plus', function () {
  const hash1 = 'hello world';
  const hash2 = 'the quick brown fox jumps over the lazy dog';

  describe('(32)', function () {
    it('should generate a 32-bit hash if specified', function () {
      const h1 = fnv1a32(hash1);
      const h2 = fnv1a32(hash2);

      expect(h1).toEqual(3582672807);
      expect(h2).toEqual(4016652272);
    });
  });
});
