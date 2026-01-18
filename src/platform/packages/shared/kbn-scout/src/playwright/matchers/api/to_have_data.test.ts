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
  describe('data existence check (no arguments)', () => {
    it('should pass when data has a value', () => {
      const response = createApiResponse({ data: { id: 1 } });
      expect(() => apiExpect(response).toHaveData()).not.toThrow();
    });

    it('should pass when data is false (falsy but defined)', () => {
      const response = createApiResponse({ data: false });
      expect(() => apiExpect(response).toHaveData()).not.toThrow();
    });

    it('should pass when data is 0 (falsy but defined)', () => {
      const response = createApiResponse({ data: 0 });
      expect(() => apiExpect(response).toHaveData()).not.toThrow();
    });

    it('should pass when data is empty string (falsy but defined)', () => {
      const response = createApiResponse({ data: '' });
      expect(() => apiExpect(response).toHaveData()).not.toThrow();
    });

    it('should fail when data is null', () => {
      const response = createApiResponse({ data: null });
      expect(() => apiExpect(response).toHaveData()).toThrow();
    });

    it('should fail when data is undefined', () => {
      const response = createApiResponse({ data: undefined });
      expect(() => apiExpect(response).toHaveData()).toThrow();
    });

    it('should support negation', () => {
      const response = createApiResponse({ data: null });
      expect(() => apiExpect(response).not.toHaveData()).not.toThrow();
    });
  });

  describe('object matching (partial by default)', () => {
    it('should pass when data contains expected properties', () => {
      const response = createApiResponse({ data: { id: 1, name: 'test', extra: 'field' } });
      expect(() => apiExpect(response).toHaveData({ id: 1, name: 'test' })).not.toThrow();
    });

    it('should fail when data is missing expected properties', () => {
      const response = createApiResponse({ data: { id: 1 } });
      expect(() => apiExpect(response).toHaveData({ id: 1, name: 'test' })).toThrow();
    });

    it('should fail when property values do not match', () => {
      const response = createApiResponse({ data: { id: 1, name: 'other' } });
      expect(() => apiExpect(response).toHaveData({ id: 1, name: 'test' })).toThrow();
    });

    it('should support negation for objects', () => {
      const response = createApiResponse({ data: { id: 1, name: 'test' } });
      expect(() => apiExpect(response).not.toHaveData({ id: 2 })).not.toThrow();
    });
  });

  describe('object matching with exactMatch option', () => {
    it('should fail when data has extra properties with exactMatch', () => {
      const response = createApiResponse({ data: { id: 1, name: 'test', extra: 'field' } });
      expect(() =>
        apiExpect(response).toHaveData({ id: 1, name: 'test' }, { exactMatch: true })
      ).toThrow();
    });

    it('should pass when data matches exactly with exactMatch', () => {
      const response = createApiResponse({ data: { id: 1, name: 'test' } });
      expect(() =>
        apiExpect(response).toHaveData({ id: 1, name: 'test' }, { exactMatch: true })
      ).not.toThrow();
    });
  });

  describe('primitive matching (exact)', () => {
    it('should pass when string data matches exactly', () => {
      const response = createApiResponse({ data: 'success' });
      expect(() => apiExpect(response).toHaveData('success')).not.toThrow();
    });

    it('should fail when string data does not match', () => {
      const response = createApiResponse({ data: 'failure' });
      expect(() => apiExpect(response).toHaveData('success')).toThrow();
    });

    it('should pass when number data matches exactly', () => {
      const response = createApiResponse({ data: 42 });
      expect(() => apiExpect(response).toHaveData(42)).not.toThrow();
    });

    it('should support negation for primitives', () => {
      const response = createApiResponse({ data: 'success' });
      expect(() => apiExpect(response).not.toHaveData('failure')).not.toThrow();
    });
  });

  describe('array matching', () => {
    it('should pass when array elements partially match', () => {
      const response = createApiResponse({
        data: [
          { id: 1, extra: 'a' },
          { id: 2, extra: 'b' },
        ],
      });
      expect(() => apiExpect(response).toHaveData([{ id: 1 }, { id: 2 }])).not.toThrow();
    });

    it('should fail when array lengths differ', () => {
      const response = createApiResponse({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      expect(() => apiExpect(response).toHaveData([{ id: 1 }, { id: 2 }])).toThrow();
    });

    it('should pass with exactMatch when arrays match exactly', () => {
      const response = createApiResponse({ data: [{ id: 1 }, { id: 2 }] });
      expect(() =>
        apiExpect(response).toHaveData([{ id: 1 }, { id: 2 }], { exactMatch: true })
      ).not.toThrow();
    });
  });
});
