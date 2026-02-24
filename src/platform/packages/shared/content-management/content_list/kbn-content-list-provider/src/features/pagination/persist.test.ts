/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPersistedPageSize, setPersistedPageSize } from './persist';

describe('pagination persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getPersistedPageSize', () => {
    it('returns fallback when no persisted value exists', () => {
      expect(getPersistedPageSize('my-list', 20)).toBe(20);
    });

    it('returns the persisted value', () => {
      localStorage.setItem('contentList:pageSize:my-list', '50');
      expect(getPersistedPageSize('my-list', 20)).toBe(50);
    });

    it('returns fallback for non-numeric persisted value', () => {
      localStorage.setItem('contentList:pageSize:my-list', 'not-a-number');
      expect(getPersistedPageSize('my-list', 20)).toBe(20);
    });

    it('returns fallback for zero persisted value', () => {
      localStorage.setItem('contentList:pageSize:my-list', '0');
      expect(getPersistedPageSize('my-list', 20)).toBe(20);
    });

    it('returns fallback for negative persisted value', () => {
      localStorage.setItem('contentList:pageSize:my-list', '-10');
      expect(getPersistedPageSize('my-list', 20)).toBe(20);
    });

    it('returns fallback when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      expect(getPersistedPageSize('my-list', 20)).toBe(20);

      jest.restoreAllMocks();
    });
  });

  describe('setPersistedPageSize', () => {
    it('writes value to localStorage', () => {
      setPersistedPageSize('my-list', 50);
      expect(localStorage.getItem('contentList:pageSize:my-list')).toBe('50');
    });

    it('overwrites existing value', () => {
      setPersistedPageSize('my-list', 50);
      setPersistedPageSize('my-list', 100);
      expect(localStorage.getItem('contentList:pageSize:my-list')).toBe('100');
    });

    it('does not throw when localStorage is unavailable', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      expect(() => setPersistedPageSize('my-list', 50)).not.toThrow();

      jest.restoreAllMocks();
    });
  });
});
