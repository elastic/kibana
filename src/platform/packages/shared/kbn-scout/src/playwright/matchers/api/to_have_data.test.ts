/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('toHaveData', () => {
  describe('existence check (no arguments)', () => {
    it('passes when data exists (including falsy values like 0, false, "")', () => {
      expect(() => apiExpect({ data: { id: 1 } }).toHaveData()).not.toThrow();
      expect(() => apiExpect({ data: 0 }).toHaveData()).not.toThrow();
      expect(() => apiExpect({ data: false }).toHaveData()).not.toThrow();
      expect(() => apiExpect({ data: '' }).toHaveData()).not.toThrow();
    });

    it('fails when data is null or undefined', () => {
      expect(() => apiExpect({ data: null }).toHaveData()).toThrow();
      expect(() => apiExpect({ data: undefined }).toHaveData()).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect({ data: null }).not.toHaveData()).not.toThrow();
    });
  });

  describe('primitive matching', () => {
    it('matches primitives exactly', () => {
      expect(() => apiExpect({ data: 'success' }).toHaveData('success')).not.toThrow();
      expect(() => apiExpect({ data: 42 }).toHaveData(42)).not.toThrow();
      expect(() => apiExpect({ data: 'a' }).toHaveData('b')).toThrow();
    });
  });

  describe('partial object matching (default)', () => {
    it('passes when data contains expected properties', () => {
      expect(() =>
        apiExpect({ data: { id: 1, name: 'test', extra: 'ignored' } }).toHaveData({
          id: 1,
          name: 'test',
        })
      ).not.toThrow();
    });

    it('fails when expected properties are missing', () => {
      expect(() => apiExpect({ data: { id: 1 } }).toHaveData({ id: 1, name: 'test' })).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect({ data: { id: 1 } }).not.toHaveData({ id: 2 })).not.toThrow();
    });
  });

  describe('exact matching with { exactMatch: true }', () => {
    it('fails when data has extra properties', () => {
      expect(() =>
        apiExpect({ data: { id: 1, extra: 'field' } }).toHaveData({ id: 1 }, { exactMatch: true })
      ).toThrow();
    });

    it('passes only when data matches exactly', () => {
      expect(() =>
        apiExpect({ data: { id: 1 } }).toHaveData({ id: 1 }, { exactMatch: true })
      ).not.toThrow();
    });

    it('requires exact array length and order', () => {
      expect(() =>
        apiExpect({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] }).toHaveData([{ id: 1 }, { id: 2 }], {
          exactMatch: true,
        })
      ).toThrow();
    });
  });

  describe('partial array matching (default)', () => {
    it('allows extra items and ignores order', () => {
      expect(() =>
        apiExpect({ data: [{ id: 3 }, { id: 1 }, { id: 2 }] }).toHaveData([{ id: 1 }])
      ).not.toThrow();
    });

    it('allows extra properties on array items', () => {
      expect(() =>
        apiExpect({ data: [{ id: 1, extra: 'a' }] }).toHaveData([{ id: 1 }])
      ).not.toThrow();
    });

    it('fails when expected item is not found', () => {
      expect(() => apiExpect({ data: [{ id: 1 }, { id: 2 }] }).toHaveData([{ id: 999 }])).toThrow();
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
      // This tests: partial object matching, partial array matching, deep nesting,
      // and matching two different items in the same array (parallel branches)
      expect(() =>
        apiExpect({ data: complexData }).toHaveData({
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
        apiExpect({ data: complexData }).toHaveData({
          meta: { version: '1.0' },
          results: { items: [{ id: 'nonexistent' }] },
        })
      ).toThrow();
    });
  });
});
