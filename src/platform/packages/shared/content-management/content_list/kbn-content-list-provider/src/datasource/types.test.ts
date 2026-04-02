/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIncludeExcludeFilter, TAG_FILTER_ID, CREATED_BY_FILTER_ID } from './types';
import type { IncludeExcludeFilter } from './types';

describe('datasource type utilities', () => {
  describe('getIncludeExcludeFilter', () => {
    it('returns the filter when the value is an `IncludeExcludeFilter` object.', () => {
      const filter: IncludeExcludeFilter = { include: ['a'], exclude: ['b'] };
      expect(getIncludeExcludeFilter(filter)).toBe(filter);
    });

    it('returns the filter for an object with only `include`.', () => {
      const filter: IncludeExcludeFilter = { include: ['a'] };
      expect(getIncludeExcludeFilter(filter)).toBe(filter);
    });

    it('returns `undefined` for a string value.', () => {
      expect(getIncludeExcludeFilter('search text')).toBeUndefined();
    });

    it('returns `undefined` for a boolean value.', () => {
      expect(getIncludeExcludeFilter(true)).toBeUndefined();
    });

    it('returns `undefined` for `undefined`.', () => {
      expect(getIncludeExcludeFilter(undefined)).toBeUndefined();
    });

    it('returns `undefined` for `false`.', () => {
      expect(getIncludeExcludeFilter(false)).toBeUndefined();
    });
  });

  describe('filter ID constants', () => {
    it('TAG_FILTER_ID is `tag`.', () => {
      expect(TAG_FILTER_ID).toBe('tag');
    });

    it('CREATED_BY_FILTER_ID is `createdBy`.', () => {
      expect(CREATED_BY_FILTER_ID).toBe('createdBy');
    });
  });
});
