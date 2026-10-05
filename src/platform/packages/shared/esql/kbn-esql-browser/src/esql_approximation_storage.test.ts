/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlApproximationStorage } from './esql_approximation_storage';

const STORAGE_KEY = 'kibana.esql.fastMode';

describe('esqlApproximationStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('get()', () => {
    it('returns undefined when no value is stored', () => {
      expect(esqlApproximationStorage.get()).toBeUndefined();
    });

    it('returns true when stored value is "true"', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      expect(esqlApproximationStorage.get()).toBe(true);
    });

    it('returns false when stored value is "false"', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      expect(esqlApproximationStorage.get()).toBe(false);
    });
  });

  describe('set()', () => {
    it('writes "true" to localStorage when called with true', () => {
      esqlApproximationStorage.set(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('writes "false" to localStorage when called with false', () => {
      esqlApproximationStorage.set(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('overwrites an existing value', () => {
      esqlApproximationStorage.set(true);
      esqlApproximationStorage.set(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });
});
