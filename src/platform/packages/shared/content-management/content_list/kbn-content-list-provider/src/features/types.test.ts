/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSortingConfig, isPaginationConfig, isSearchConfig, isFilterFacetConfig } from './types';

describe('feature type guards', () => {
  describe('isSortingConfig', () => {
    it('returns `true` for an object config.', () => {
      expect(isSortingConfig({ initialSort: { field: 'title', direction: 'asc' } })).toBe(true);
    });

    it('returns `true` for an empty object config.', () => {
      expect(isSortingConfig({})).toBe(true);
    });

    it('returns `false` for `true`.', () => {
      expect(isSortingConfig(true)).toBe(false);
    });

    it('returns `false` for `false`.', () => {
      expect(isSortingConfig(false)).toBe(false);
    });

    it('returns `false` for `undefined`.', () => {
      expect(isSortingConfig(undefined)).toBe(false);
    });
  });

  describe('isPaginationConfig', () => {
    it('returns `true` for an object config.', () => {
      expect(isPaginationConfig({ initialPageSize: 50 })).toBe(true);
    });

    it('returns `true` for an empty object config.', () => {
      expect(isPaginationConfig({})).toBe(true);
    });

    it('returns `false` for `true`.', () => {
      expect(isPaginationConfig(true)).toBe(false);
    });

    it('returns `false` for `false`.', () => {
      expect(isPaginationConfig(false)).toBe(false);
    });

    it('returns `false` for `undefined`.', () => {
      expect(isPaginationConfig(undefined)).toBe(false);
    });
  });

  describe('isSearchConfig', () => {
    it('returns `true` for an object config.', () => {
      expect(isSearchConfig({ initialSearch: 'hello' })).toBe(true);
    });

    it('returns `true` for an empty object config.', () => {
      expect(isSearchConfig({})).toBe(true);
    });

    it('returns `false` for `true`.', () => {
      expect(isSearchConfig(true)).toBe(false);
    });

    it('returns `false` for `false`.', () => {
      expect(isSearchConfig(false)).toBe(false);
    });

    it('returns `false` for `undefined`.', () => {
      expect(isSearchConfig(undefined)).toBe(false);
    });
  });

  describe('isFilterFacetConfig', () => {
    it('returns `true` for a `FilterFacetConfig` object.', () => {
      expect(isFilterFacetConfig({ getFacets: jest.fn() })).toBe(true);
    });

    it('returns `false` for `true`.', () => {
      expect(isFilterFacetConfig(true)).toBe(false);
    });

    it('returns `false` for `false`.', () => {
      expect(isFilterFacetConfig(false)).toBe(false);
    });

    it('returns `false` for `undefined`.', () => {
      expect(isFilterFacetConfig(undefined)).toBe(false);
    });

    it('returns `false` for `null`.', () => {
      expect(isFilterFacetConfig(null as unknown as boolean)).toBe(false);
    });
  });
});
