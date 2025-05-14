/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateLongId,
  generateLongIdWithSeed,
  generateShortId,
  resetSequentialGenerator,
  setIdGeneratorStrategy,
} from './generate_id';

const generatorVariants = [
  { type: 'short', length: 16, generateId: generateShortId },
  { type: 'long', length: 32, generateId: generateLongId },
];

describe('generate_id', () => {
  describe.each(generatorVariants)('generate sequential $type ids', ({ generateId, length }) => {
    beforeEach(() => {
      setIdGeneratorStrategy('sequential');
      resetSequentialGenerator();
    });

    it('should generate ids of the correct length', () => {
      const generatedId = generateId();
      expect(generatedId.length).toBe(length);
    });

    it('should generate ids deterministically', () => {
      const firstId = generateId();

      resetSequentialGenerator();

      const secondId = generateId();

      expect(firstId).toEqual(secondId);
    });

    it('should generate sequential ids', () => {
      const firstId = generateId();
      const secondId = generateId();
      const thirdId = generateId();

      expect(firstId < secondId).toBeTruthy();
      expect(secondId < thirdId).toBeTruthy();
    });
  });

  describe.each(generatorVariants)('generate random $type ids', ({ generateId, length }) => {
    beforeEach(() => {
      setIdGeneratorStrategy('random');
      resetSequentialGenerator();
    });

    it('should generate ids of correct length and format', () => {
      const shortId = generateId();

      expect(shortId).toMatch(new RegExp(`^[0-9a-fA-F]{${length}}$`));
    });

    it('should generate unique ids', () => {
      const firstId = generateId();
      const secondId = generateId();

      expect(firstId).not.toEqual(secondId);
    });
  });

  describe('generate long seeded ids', () => {
    it('should generate a long id with a seed and correct padding', () => {
      const seed = 'order/123';
      const longIdWithSeed = generateLongIdWithSeed(seed);
      expect(longIdWithSeed.length).toBe(32);
      expect(longIdWithSeed).toEqual('00000000000000000000000order_123');
    });
  });
});
