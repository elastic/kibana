/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('restrictMatchers Proxy', () => {
  describe('disallowed matchers', () => {
    it('throws for a disallowed matcher', () => {
      // @ts-expect-error — toBeTruthy is intentionally not in our Matchers type
      expect(() => apiExpect(true).toBeTruthy()).toThrow(
        "Matcher 'toBeTruthy' is not available in Scout API tests"
      );
    });

    it('throws for a disallowed matcher via .not', () => {
      // @ts-expect-error — toBeTruthy is intentionally not in our Matchers type
      expect(() => apiExpect(true).not.toBeTruthy()).toThrow(
        "Matcher 'toBeTruthy' is not available in Scout API tests"
      );
    });
  });

  describe('custom message support', () => {
    // Custom messages are rendered by Playwright's test runner, not available in Jest.
    // This test verifies the message parameter doesn't break the assertion.
    it('accepts a custom message without breaking', () => {
      expect(() => apiExpect(42, 'custom message').toBe(42)).not.toThrow();
      expect(() => apiExpect(42, { message: 'custom message' }).toBe(42)).not.toThrow();
    });
  });

  describe('expect.poll', () => {
    it('resolves when the polled value eventually matches', async () => {
      let callCount = 0;
      await expect(
        apiExpect.poll(() => ++callCount >= 3, { timeout: 5000, intervals: [100] }).toBe(true)
      ).resolves.toBeUndefined();
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('blocks disallowed matchers on poll result', () => {
      // @ts-expect-error — toBeTruthy is intentionally not in our PollMatchers type
      expect(() => apiExpect.poll(() => true).toBeTruthy()).toThrow(
        "Matcher 'toBeTruthy' is not available in Scout API tests"
      );
    });
  });

  describe('structural property access', () => {
    it('allows symbol-keyed access without throwing', () => {
      const result = apiExpect(42);
      expect(() => (result as any)[Symbol.iterator]).not.toThrow();
      expect(() => (result as any)[Symbol.toPrimitive]).not.toThrow();
    });

    it('allows toJSON access without throwing', () => {
      expect(() => (apiExpect(42) as any).toJSON).not.toThrow();
    });

    it('allows then access without throwing', () => {
      expect(() => (apiExpect(42) as any).then).not.toThrow();
    });
  });
});
