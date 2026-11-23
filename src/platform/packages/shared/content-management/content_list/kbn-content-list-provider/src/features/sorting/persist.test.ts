/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListFeatures } from '../types';
import { getPersistedSort, setPersistedSort } from './persist';

const sorting: ContentListFeatures['sorting'] = {
  fields: [
    { field: 'title', name: 'Name' },
    { field: 'accessedAt', name: 'Recently viewed', allowedDirections: ['desc'] },
  ],
};

describe('sorting persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPersistedSort', () => {
    it('returns undefined when no value is persisted', () => {
      expect(getPersistedSort('my-list', sorting)).toBeUndefined();
    });

    it('returns the persisted sort when it is allowed', () => {
      localStorage.setItem('contentList:sort:my-list', 'accessedAt:desc');
      expect(getPersistedSort('my-list', sorting)).toEqual({
        field: 'accessedAt',
        direction: 'desc',
      });
    });

    it.each([
      ['an unknown field', 'status:asc'],
      ['a direction the field does not allow', 'accessedAt:asc'],
    ])('returns undefined for %s', (_, raw) => {
      localStorage.setItem('contentList:sort:my-list', raw);
      expect(getPersistedSort('my-list', sorting)).toBeUndefined();
    });

    it('keeps sorts separate per key', () => {
      localStorage.setItem('contentList:sort:list-a', 'title:desc');
      expect(getPersistedSort('list-b', sorting)).toBeUndefined();
    });

    it('returns undefined when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      expect(getPersistedSort('my-list', sorting)).toBeUndefined();
    });
  });

  describe('setPersistedSort', () => {
    it('writes the sort as `field:direction`', () => {
      setPersistedSort('my-list', { field: 'title', direction: 'desc' });
      expect(localStorage.getItem('contentList:sort:my-list')).toBe('title:desc');
    });

    it('overwrites an existing value and round-trips', () => {
      setPersistedSort('my-list', { field: 'title', direction: 'asc' });
      setPersistedSort('my-list', { field: 'accessedAt', direction: 'desc' });
      expect(getPersistedSort('my-list', sorting)).toEqual({
        field: 'accessedAt',
        direction: 'desc',
      });
    });
  });
});
