/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readLocalStorage, writeLocalStorage } from './local_storage';

describe('local_storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('readLocalStorage', () => {
    it('returns null when the key is missing', () => {
      expect(readLocalStorage('missing')).toBeNull();
    });

    it('returns the stored string', () => {
      localStorage.setItem('contentList:key', 'value');
      expect(readLocalStorage('key')).toBe('value');
    });

    it('returns null when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      expect(readLocalStorage('key')).toBeNull();
    });
  });

  describe('writeLocalStorage', () => {
    it('writes and overwrites the value', () => {
      writeLocalStorage('key', 'a');
      writeLocalStorage('key', 'b');
      expect(localStorage.getItem('contentList:key')).toBe('b');
    });

    it('does not throw when localStorage is unavailable', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      expect(() => writeLocalStorage('key', 'a')).not.toThrow();
    });
  });
});
