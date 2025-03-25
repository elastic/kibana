/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  setIdGeneratorStrategy,
  generateLongId,
  generateShortId,
  generateLongIdWithSeed,
} from './generate_id';

describe('generate_id', () => {
  describe('generate deterministic ids', () => {
    it('should generate a short id of the correct length and format', () => {
      setIdGeneratorStrategy('sequential');
      const shortId = generateShortId();
      expect(shortId.length).toBe(16);
      expect(shortId).toContain('00000000000');
    });

    it('should generate a long id of the correct length and format', () => {
      setIdGeneratorStrategy('sequential');
      const longId = generateLongId();
      expect(longId.length).toBe(32);
      expect(longId).toContain('000000000000000000000000001');
    });

    it('should generate a long id with a seed and correct padding', () => {
      const seed = 'order/123';
      const longIdWithSeed = generateLongIdWithSeed(seed);
      expect(longIdWithSeed.length).toBe(32);
      expect(longIdWithSeed).toEqual('00000000000000000000000order_123');
    });
  });

  describe('generate random ids', () => {
    it('should generate a unique id of correct length and valid format', () => {
      setIdGeneratorStrategy('random');
      const shortId = generateShortId();

      expect(shortId.length).toBe(16);

      expect(shortId).toMatch(/^(?!\d{14})[0-9a-fA-F]{14}\d{2}$/);
    });

    it('should generate a long id of the correct length and format', () => {
      setIdGeneratorStrategy('random');
      const longId = generateLongId();

      expect(longId.length).toBe(32);
      expect(longId).toMatch(/^(?!\d{14})[0-9a-fA-F]{14}\d{18}$/);
    });
  });
});
