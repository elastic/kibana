/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';
import { createApiResponse } from './utils';

describe('toHaveData', () => {
  describe('existence check (no arguments)', () => {
    it('passes when data exists (including falsy values like 0, false, "")', () => {
      expect(() => apiExpect(createApiResponse({ data: { id: 1 } })).toHaveData()).not.toThrow();
      expect(() => apiExpect(createApiResponse({ data: 0 })).toHaveData()).not.toThrow();
      expect(() => apiExpect(createApiResponse({ data: false })).toHaveData()).not.toThrow();
      expect(() => apiExpect(createApiResponse({ data: '' })).toHaveData()).not.toThrow();
    });

    it('fails when data is null or undefined', () => {
      expect(() => apiExpect(createApiResponse({ data: null })).toHaveData()).toThrow();
      expect(() => apiExpect(createApiResponse({ data: undefined })).toHaveData()).toThrow();
    });

    it('supports negation', () => {
      expect(() => apiExpect(createApiResponse({ data: null })).not.toHaveData()).not.toThrow();
    });
  });

  describe('primitive matching', () => {
    it('matches primitives exactly', () => {
      expect(() =>
        apiExpect(createApiResponse({ data: 'success' })).toHaveData('success')
      ).not.toThrow();
      expect(() => apiExpect(createApiResponse({ data: 42 })).toHaveData(42)).not.toThrow();
      expect(() => apiExpect(createApiResponse({ data: 'a' })).toHaveData('b')).toThrow();
    });
  });

  describe('partial object matching (default)', () => {
    it('passes when data contains expected properties', () => {
      const response = createApiResponse({ data: { id: 1, name: 'test', extra: 'ignored' } });
      expect(() => apiExpect(response).toHaveData({ id: 1, name: 'test' })).not.toThrow();
    });

    it('fails when expected properties are missing', () => {
      const response = createApiResponse({ data: { id: 1 } });
      expect(() => apiExpect(response).toHaveData({ id: 1, name: 'test' })).toThrow();
    });

    it('supports negation', () => {
      const response = createApiResponse({ data: { id: 1 } });
      expect(() => apiExpect(response).not.toHaveData({ id: 2 })).not.toThrow();
    });
  });

  describe('exact matching with { exactMatch: true }', () => {
    it('fails when data has extra properties', () => {
      const response = createApiResponse({ data: { id: 1, extra: 'field' } });
      expect(() => apiExpect(response).toHaveData({ id: 1 }, { exactMatch: true })).toThrow();
    });

    it('passes only when data matches exactly', () => {
      const response = createApiResponse({ data: { id: 1 } });
      expect(() => apiExpect(response).toHaveData({ id: 1 }, { exactMatch: true })).not.toThrow();
    });

    it('requires exact array length and order', () => {
      const response = createApiResponse({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      expect(() =>
        apiExpect(response).toHaveData([{ id: 1 }, { id: 2 }], { exactMatch: true })
      ).toThrow();
    });
  });

  describe('partial array matching (default)', () => {
    it('allows extra items and ignores order', () => {
      const response = createApiResponse({ data: [{ id: 3 }, { id: 1 }, { id: 2 }] });
      expect(() => apiExpect(response).toHaveData([{ id: 1 }])).not.toThrow();
    });

    it('allows extra properties on array items', () => {
      const response = createApiResponse({ data: [{ id: 1, extra: 'a' }] });
      expect(() => apiExpect(response).toHaveData([{ id: 1 }])).not.toThrow();
    });

    it('fails when expected item is not found', () => {
      const response = createApiResponse({ data: [{ id: 1 }, { id: 2 }] });
      expect(() => apiExpect(response).toHaveData([{ id: 999 }])).toThrow();
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
      const response = createApiResponse({ data: complexData });
      // This tests: partial object matching, partial array matching, deep nesting,
      // and matching two different items in the same array (parallel branches)
      expect(() =>
        apiExpect(response).toHaveData({
          meta: { version: '1.0' },
          results: {
            total: 100,
            items: [{ id: 'a', children: [{ childId: 'a2' }] }, { children: [{ childId: 'b1' }] }],
          },
        })
      ).not.toThrow();
    });

    it('fails when any branch does not match', () => {
      const response = createApiResponse({ data: complexData });
      expect(() =>
        apiExpect(response).toHaveData({
          meta: { version: '1.0' },
          results: { items: [{ id: 'nonexistent' }] },
        })
      ).toThrow();
    });
  });
});
