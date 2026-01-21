/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('toHaveBody', () => {
  describe('existence check (no arguments)', () => {
    it('passes when body exists (including falsy values like 0, false, "")', () => {
      expect(() => apiExpect({ body: { id: 1 } }).toHaveBody()).not.toThrow();
      expect(() => apiExpect({ body: 0 }).toHaveBody()).not.toThrow();
      expect(() => apiExpect({ body: false }).toHaveBody()).not.toThrow();
      expect(() => apiExpect({ body: '' }).toHaveBody()).not.toThrow();
    });

    it('fails when body is null or undefined', () => {
      expect(() => apiExpect({ body: null }).toHaveBody()).toThrow();
      expect(() => apiExpect({ body: undefined }).toHaveBody()).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect({ body: null }).not.toHaveBody()).not.toThrow();
    });
  });

  describe('primitive matching', () => {
    it('matches primitives exactly', () => {
      expect(() => apiExpect({ body: 'success' }).toHaveBody('success')).not.toThrow();
      expect(() => apiExpect({ body: 42 }).toHaveBody(42)).not.toThrow();
      expect(() => apiExpect({ body: 'a' }).toHaveBody('b')).toThrow();
    });
  });

  describe('partial object matching (default)', () => {
    it('passes when body contains expected properties', () => {
      expect(() =>
        apiExpect({ body: { id: 1, name: 'test', extra: 'ignored' } }).toHaveBody({
          id: 1,
          name: 'test',
        })
      ).not.toThrow();
    });

    it('fails when expected properties are missing', () => {
      expect(() => apiExpect({ body: { id: 1 } }).toHaveBody({ id: 1, name: 'test' })).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect({ body: { id: 1 } }).not.toHaveBody({ id: 2 })).not.toThrow();
    });
  });

  describe('exact matching with { exactMatch: true }', () => {
    it('fails when body has extra properties', () => {
      expect(() =>
        apiExpect({ body: { id: 1, extra: 'field' } }).toHaveBody({ id: 1 }, { exactMatch: true })
      ).toThrow();
    });

    it('passes only when body matches exactly', () => {
      expect(() =>
        apiExpect({ body: { id: 1 } }).toHaveBody({ id: 1 }, { exactMatch: true })
      ).not.toThrow();
    });

    it('requires exact array length and order', () => {
      expect(() =>
        apiExpect({ body: [{ id: 1 }, { id: 2 }, { id: 3 }] }).toHaveBody([{ id: 1 }, { id: 2 }], {
          exactMatch: true,
        })
      ).toThrow();
    });
  });

  describe('partial array matching (default)', () => {
    it('allows extra items and ignores order', () => {
      expect(() =>
        apiExpect({ body: [{ id: 3 }, { id: 1 }, { id: 2 }] }).toHaveBody([{ id: 1 }])
      ).not.toThrow();
    });

    it('allows extra properties on array items', () => {
      expect(() =>
        apiExpect({ body: [{ id: 1, extra: 'a' }] }).toHaveBody([{ id: 1 }])
      ).not.toThrow();
    });

    it('fails when expected item is not found', () => {
      expect(() => apiExpect({ body: [{ id: 1 }, { id: 2 }] }).toHaveBody([{ id: 999 }])).toThrow();
    });
  });

  describe('deep nesting with parallel branches', () => {
    const complexBody = {
      meta: { version: '1.0', extra: 'ignored' },
      results: {
        total: 100,
        items: [
          { id: 'a', children: [{ childId: 'a1' }, { childId: 'a2' }] },
          { id: 'b', children: [{ childId: 'b1' }] },
        ],
      },
    };

    it('matches multiple branches and nested arrays simultaneously', () => {
      expect(() =>
        apiExpect({ body: complexBody }).toHaveBody({
          meta: { version: '1.0' },
          results: {
            total: 100,
            items: [{ id: 'a', children: [{ childId: 'a2' }] }, { children: [{ childId: 'b1' }] }],
          },
        })
      ).not.toThrow();
    });

    it('fails when any branch does not match', () => {
      expect(() =>
        apiExpect({ body: complexBody }).toHaveBody({
          meta: { version: '1.0' },
          results: { items: [{ id: 'nonexistent' }] },
        })
      ).toThrow();
    });
  });

  describe('asymmetric matchers', () => {
    describe('expect.toBeDefined()', () => {
      it('passes for any non-null/undefined value including falsy ones', () => {
        expect(() =>
          apiExpect({ body: { a: 'str', b: 0, c: '', d: false } }).toHaveBody({
            a: apiExpect.toBeDefined(),
            b: apiExpect.toBeDefined(),
            c: apiExpect.toBeDefined(),
            d: apiExpect.toBeDefined(),
          })
        ).not.toThrow();
      });

      it('fails for null or undefined values', () => {
        expect(() =>
          apiExpect({ body: { a: null } }).toHaveBody({ a: apiExpect.toBeDefined() })
        ).toThrow();
        expect(() =>
          apiExpect({ body: { a: undefined } }).toHaveBody({ a: apiExpect.toBeDefined() })
        ).toThrow();
      });
    });

    describe('expect.toBeGreaterThan()', () => {
      it('passes when number exceeds threshold', () => {
        expect(() =>
          apiExpect({ body: { count: 5 } }).toHaveBody({ count: apiExpect.toBeGreaterThan(0) })
        ).not.toThrow();
      });

      it('fails when number equals or is below threshold', () => {
        expect(() =>
          apiExpect({ body: { count: 5 } }).toHaveBody({ count: apiExpect.toBeGreaterThan(5) })
        ).toThrow();
        expect(() =>
          apiExpect({ body: { count: 5 } }).toHaveBody({ count: apiExpect.toBeGreaterThan(10) })
        ).toThrow();
      });
    });

    describe('expect.toBeLessThan()', () => {
      it('passes when number is below threshold', () => {
        expect(() =>
          apiExpect({ body: { count: 5 } }).toHaveBody({ count: apiExpect.toBeLessThan(10) })
        ).not.toThrow();
      });

      it('fails when number equals or exceeds threshold', () => {
        expect(() =>
          apiExpect({ body: { count: 5 } }).toHaveBody({ count: apiExpect.toBeLessThan(5) })
        ).toThrow();
        expect(() =>
          apiExpect({ body: { count: 5 } }).toHaveBody({ count: apiExpect.toBeLessThan(3) })
        ).toThrow();
      });
    });

    it('works on nested object properties', () => {
      const body = { user: { profile: { age: 25, name: 'test' } } };
      expect(() =>
        apiExpect({ body }).toHaveBody({
          user: { profile: { age: apiExpect.toBeGreaterThan(18) } },
        })
      ).not.toThrow();
    });

    it('works on items inside nested arrays', () => {
      const body = { items: [{ count: 5 }, { count: 10 }] };
      expect(() =>
        apiExpect({ body }).toHaveBody({
          items: [{ count: apiExpect.toBeGreaterThan(4) }],
        })
      ).not.toThrow();
    });
  });

  // toHaveData uses the same internal logic, just operates on 'data' instead of 'body'
  it('toHaveData works the same way for kbnClient/apiServices responses', () => {
    expect(() => apiExpect({ data: { id: 1, name: 'test' } }).toHaveData({ id: 1 })).not.toThrow();
    expect(() => apiExpect({ data: null }).toHaveData()).toThrow();
    expect(() => apiExpect({ data: null }).not.toHaveData()).not.toThrow();
  });
});
