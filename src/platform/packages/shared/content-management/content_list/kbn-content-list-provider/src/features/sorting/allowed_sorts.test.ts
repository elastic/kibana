/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAllowedSorts,
  getInitialSort,
  getSortKey,
  isAllowedSort,
  parseSortKey,
  toSortDirectionsByField,
} from './allowed_sorts';
import { DEFAULT_INITIAL_SORT } from './types';

describe('allowed sorts', () => {
  describe('getSortKey', () => {
    it('builds a `field:direction` key', () => {
      expect(getSortKey({ field: 'title', direction: 'desc' })).toBe('title:desc');
    });
  });

  describe('parseSortKey', () => {
    it('parses a `field:direction` key', () => {
      expect(parseSortKey('accessedAt:desc')).toEqual({ field: 'accessedAt', direction: 'desc' });
    });

    it.each([
      ['an empty key', ''],
      ['a missing direction', 'title'],
      ['a missing field', ':asc'],
      ['an unknown direction', 'title:sideways'],
      ['extra segments', 'title:asc:extra'],
    ])('returns undefined for %s', (_, key) => {
      expect(parseSortKey(key)).toBeUndefined();
    });
  });

  describe('getAllowedSorts', () => {
    it.each([
      ['undefined', undefined],
      ['true', true],
      ['an empty config', {}],
    ])('falls back to the default fields for %s', (_, sorting) => {
      expect(getAllowedSorts(sorting)).toEqual([
        { field: 'title', direction: 'asc' },
        { field: 'title', direction: 'desc' },
        { field: 'updatedAt', direction: 'asc' },
        { field: 'updatedAt', direction: 'desc' },
      ]);
    });

    it('expands `fields` into both directions, honoring `allowedDirections`', () => {
      expect(
        getAllowedSorts({
          fields: [
            { field: 'title', name: 'Name' },
            { field: 'accessedAt', name: 'Recently viewed', allowedDirections: ['desc'] },
          ],
        })
      ).toEqual([
        { field: 'title', direction: 'asc' },
        { field: 'title', direction: 'desc' },
        { field: 'accessedAt', direction: 'desc' },
      ]);
    });

    it('returns `options` as listed', () => {
      expect(
        getAllowedSorts({
          options: [
            { label: 'Newest', field: 'updatedAt', direction: 'desc' },
            { label: 'Name', field: 'title', direction: 'asc' },
          ],
        })
      ).toEqual([
        { field: 'updatedAt', direction: 'desc' },
        { field: 'title', direction: 'asc' },
      ]);
    });

    it('prefers `fields` over `options`', () => {
      expect(
        getAllowedSorts({
          fields: [{ field: 'title', name: 'Name', allowedDirections: ['asc'] }],
          options: [{ label: 'Newest', field: 'updatedAt', direction: 'desc' }],
        })
      ).toEqual([{ field: 'title', direction: 'asc' }]);
    });
  });

  describe('getInitialSort', () => {
    it('returns the configured initial sort', () => {
      expect(getInitialSort({ initialSort: { field: 'updatedAt', direction: 'desc' } })).toEqual({
        field: 'updatedAt',
        direction: 'desc',
      });
    });

    it.each([
      ['undefined', undefined],
      ['true', true],
      ['a config without `initialSort`', {}],
    ])('returns the default for %s', (_, sorting) => {
      expect(getInitialSort(sorting)).toEqual(DEFAULT_INITIAL_SORT);
    });
  });

  describe('toSortDirectionsByField', () => {
    it('groups directions by field', () => {
      const result = toSortDirectionsByField([
        { field: 'title', direction: 'asc' },
        { field: 'accessedAt', direction: 'desc' },
        { field: 'title', direction: 'desc' },
      ]);

      expect(result.get('title')).toEqual(new Set(['asc', 'desc']));
      expect(result.get('accessedAt')).toEqual(new Set(['desc']));
      expect(result.size).toBe(2);
    });

    it('returns an empty lookup for no sorts', () => {
      expect(toSortDirectionsByField([]).size).toBe(0);
    });
  });

  describe('isAllowedSort', () => {
    const lookup = toSortDirectionsByField([
      { field: 'title', direction: 'asc' },
      { field: 'title', direction: 'desc' },
      { field: 'accessedAt', direction: 'desc' },
    ]);

    it('accepts an allowed field and direction', () => {
      expect(isAllowedSort(lookup, { field: 'accessedAt', direction: 'desc' })).toBe(true);
    });

    it('rejects a direction the field does not offer', () => {
      expect(isAllowedSort(lookup, { field: 'accessedAt', direction: 'asc' })).toBe(false);
    });

    it('rejects an unknown field', () => {
      expect(isAllowedSort(lookup, { field: 'status', direction: 'asc' })).toBe(false);
    });
  });
});
