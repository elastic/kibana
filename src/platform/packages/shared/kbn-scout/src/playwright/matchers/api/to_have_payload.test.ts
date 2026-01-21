/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('toHavePayload', () => {
  describe('existence check (no arguments)', () => {
    it('passes when data exists (including falsy values like 0, false, "")', () => {
      // kbnClient interface (data)
      expect(() => apiExpect({ data: { id: 1 } }).toHavePayload()).not.toThrow();
      expect(() => apiExpect({ data: 0 }).toHavePayload()).not.toThrow();
      expect(() => apiExpect({ data: false }).toHavePayload()).not.toThrow();
      expect(() => apiExpect({ data: '' }).toHavePayload()).not.toThrow();
      // apiClient interface (body)
      expect(() => apiExpect({ body: { id: 1 } }).toHavePayload()).not.toThrow();
    });

    it('fails when data is null or undefined', () => {
      expect(() => apiExpect({ data: null }).toHavePayload()).toThrow();
      expect(() => apiExpect({ data: undefined }).toHavePayload()).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect({ data: null }).not.toHavePayload()).not.toThrow();
    });
  });

  describe('primitive matching', () => {
    it('matches primitives exactly', () => {
      expect(() => apiExpect({ data: 'success' }).toHavePayload('success')).not.toThrow();
      expect(() => apiExpect({ data: 42 }).toHavePayload(42)).not.toThrow();
      expect(() => apiExpect({ data: 'a' }).toHavePayload('b')).toThrow();
    });
  });

  describe('partial object matching (default)', () => {
    it('passes when data contains expected properties', () => {
      expect(() =>
        apiExpect({ data: { id: 1, name: 'test', extra: 'ignored' } }).toHavePayload({
          id: 1,
          name: 'test',
        })
      ).not.toThrow();
    });

    it('fails when expected properties are missing', () => {
      expect(() => apiExpect({ data: { id: 1 } }).toHavePayload({ id: 1, name: 'test' })).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect({ data: { id: 1 } }).not.toHavePayload({ id: 2 })).not.toThrow();
    });
  });

  describe('exact matching with { exactMatch: true }', () => {
    it('fails when data has extra properties', () => {
      expect(() =>
        apiExpect({ data: { id: 1, extra: 'field' } }).toHavePayload(
          { id: 1 },
          { exactMatch: true }
        )
      ).toThrow();
    });

    it('passes only when data matches exactly', () => {
      expect(() =>
        apiExpect({ data: { id: 1 } }).toHavePayload({ id: 1 }, { exactMatch: true })
      ).not.toThrow();
    });

    it('requires exact array length and order', () => {
      expect(() =>
        apiExpect({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] }).toHavePayload(
          [{ id: 1 }, { id: 2 }],
          {
            exactMatch: true,
          }
        )
      ).toThrow();
    });
  });

  describe('partial array matching (default)', () => {
    it('allows extra items and ignores order', () => {
      expect(() =>
        apiExpect({ data: [{ id: 3 }, { id: 1 }, { id: 2 }] }).toHavePayload([{ id: 1 }])
      ).not.toThrow();
    });

    it('allows extra properties on array items', () => {
      expect(() =>
        apiExpect({ data: [{ id: 1, extra: 'a' }] }).toHavePayload([{ id: 1 }])
      ).not.toThrow();
    });

    it('fails when expected item is not found', () => {
      expect(() =>
        apiExpect({ data: [{ id: 1 }, { id: 2 }] }).toHavePayload([{ id: 999 }])
      ).toThrow();
    });
  });

  describe('deep nesting with parallel branches', () => {
    const complexData = {
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
        apiExpect({ data: complexData }).toHavePayload({
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
        apiExpect({ data: complexData }).toHavePayload({
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
          apiExpect({ data: { a: 'str', b: 0, c: '', d: false } }).toHavePayload({
            a: apiExpect.toBeDefined(),
            b: apiExpect.toBeDefined(),
            c: apiExpect.toBeDefined(),
            d: apiExpect.toBeDefined(),
          })
        ).not.toThrow();
      });

      it('fails for null or undefined values', () => {
        expect(() =>
          apiExpect({ data: { a: null } }).toHavePayload({ a: apiExpect.toBeDefined() })
        ).toThrow();
        expect(() =>
          apiExpect({ data: { a: undefined } }).toHavePayload({ a: apiExpect.toBeDefined() })
        ).toThrow();
      });
    });

    describe('expect.toBeGreaterThan()', () => {
      it('passes when number exceeds threshold', () => {
        expect(() =>
          apiExpect({ data: { count: 5 } }).toHavePayload({ count: apiExpect.toBeGreaterThan(0) })
        ).not.toThrow();
      });

      it('fails when number equals or is below threshold', () => {
        expect(() =>
          apiExpect({ data: { count: 5 } }).toHavePayload({ count: apiExpect.toBeGreaterThan(5) })
        ).toThrow();
        expect(() =>
          apiExpect({ data: { count: 5 } }).toHavePayload({ count: apiExpect.toBeGreaterThan(10) })
        ).toThrow();
      });

      it('fails for non-number values', () => {
        expect(() =>
          apiExpect({ data: { name: 'test' } }).toHavePayload({
            name: apiExpect.toBeGreaterThan(0),
          })
        ).toThrow();
      });
    });

    it('works on nested object properties', () => {
      const data = { user: { profile: { age: 25, name: 'test' } } };
      expect(() =>
        apiExpect({ data }).toHavePayload({
          user: { profile: { age: apiExpect.toBeGreaterThan(18) } },
        })
      ).not.toThrow();
    });

    it('works on items inside nested arrays', () => {
      const data = { items: [{ count: 5 }, { count: 10 }] };
      expect(() =>
        apiExpect({ data }).toHavePayload({
          items: [{ count: apiExpect.toBeGreaterThan(4) }],
        })
      ).not.toThrow();
    });

    describe('expect.toHaveLength()', () => {
      it('matches exact length or non-empty when omitted', () => {
        expect(() =>
          apiExpect({ data: { items: [1, 2, 3] } }).toHavePayload({
            items: apiExpect.toHaveLength(3),
          })
        ).not.toThrow();
        expect(() =>
          apiExpect({ data: { items: [1, 2, 3] } }).toHavePayload({
            items: apiExpect.toHaveLength(),
          })
        ).not.toThrow();
        expect(() =>
          apiExpect({ data: { items: [] } }).toHavePayload({ items: apiExpect.toHaveLength() })
        ).toThrow();
      });
    });
  });
});
