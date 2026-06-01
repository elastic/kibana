/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  decodeNewShape,
  encodeUrlState,
  getInitialQueryText,
  getSortingConfigKey,
  getSortingUrlConfigFromKey,
  mergeAndStringify,
  queryTextCodec,
  sortCodec,
} from './url_codec';

const initialSort = { field: 'title', direction: 'asc' as const };
const validSortFields = new Set(['title', 'updatedAt']);

describe('url_codec', () => {
  describe('queryTextCodec', () => {
    it('encodes empty query text by removing q', () => {
      expect(queryTextCodec.encode('')).toEqual({ q: undefined });
    });

    it('decodes string query text', () => {
      expect(queryTextCodec.decode({ q: 'createdBy:jane dashboard' })).toBe(
        'createdBy:jane dashboard'
      );
    });

    it('ignores array query text', () => {
      expect(queryTextCodec.decode({ q: ['first', 'second'] })).toBeUndefined();
    });
  });

  describe('sortCodec', () => {
    it('encodes non-default sort', () => {
      expect(
        sortCodec(validSortFields, initialSort).encode({ field: 'updatedAt', direction: 'desc' })
      ).toEqual({ sort: 'updatedAt:desc' });
    });

    it('omits the resolved initial sort', () => {
      expect(sortCodec(validSortFields, initialSort).encode(initialSort)).toEqual({
        sort: undefined,
      });
    });

    it('decodes valid sort', () => {
      expect(sortCodec(validSortFields, initialSort).decode({ sort: 'updatedAt:asc' })).toEqual({
        field: 'updatedAt',
        direction: 'asc',
      });
    });

    it('drops unknown sort fields and warns', () => {
      const onUnknown = jest.fn();

      expect(
        sortCodec(validSortFields, initialSort, onUnknown).decode({ sort: 'foo:asc' })
      ).toBeUndefined();
      expect(onUnknown).toHaveBeenCalledWith('foo');
    });

    it('drops malformed sort and warns', () => {
      const onUnknown = jest.fn();

      expect(
        sortCodec(validSortFields, initialSort, onUnknown).decode({ sort: 'updatedAt' })
      ).toBeUndefined();
      expect(onUnknown).toHaveBeenCalledWith('updatedAt');
    });
  });

  describe('state helpers', () => {
    it('decodes new-shape state', () => {
      expect(
        decodeNewShape('?q=dashboard&sort=updatedAt%3Adesc', validSortFields, initialSort)
      ).toEqual({
        queryText: 'dashboard',
        sort: { field: 'updatedAt', direction: 'desc' },
      });
    });

    it('encodes state and omits default slices', () => {
      expect(encodeUrlState({ queryText: '', sort: initialSort }, initialSort)).toEqual({
        q: undefined,
        sort: undefined,
      });
    });

    it('merges updates with deterministic key order and preserves unrelated params', () => {
      expect(
        mergeAndStringify('?z=last&q=old', {
          q: 'new',
          sort: 'updatedAt:desc',
        })
      ).toBe('?q=new&sort=updatedAt:desc&z=last');
    });

    it('removes consumed legacy params', () => {
      expect(
        mergeAndStringify(
          '?s=dashboard&sort=title&sortdir=asc&space=default',
          { q: 'dashboard', sort: undefined },
          ['s', 'sort', 'sortdir']
        )
      ).toBe('?q=dashboard&space=default');
    });

    it('preserves the readable form of Rison-style unrelated params', () => {
      // Mirrors the global state (`_g`) value found on dashboard URLs;
      // re-encoding should leave parens, colons, commas, slashes, and `!`
      // intact rather than percent-encoding them.
      const rison =
        '(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-7d/d,to:now))';
      expect(mergeAndStringify(`?_g=${rison}`, { q: 'dashboard' })).toBe(
        `?_g=${rison}&q=dashboard`
      );
    });

    it('encodes characters that delimit query syntax even in unrelated params', () => {
      // `&`, `=`, `+`, `#`, and `?` would break the resulting URL if left
      // unencoded inside a value — keep them percent-encoded.
      expect(mergeAndStringify('', { foo: 'a&b=c+d#e?f' })).toBe('?foo=a%26b%3Dc%2Bd%23e%3Ff');
    });

    it('keeps spaces percent-encoded as %20 in `q`', () => {
      expect(mergeAndStringify('', { q: 'hello world' })).toBe('?q=hello%20world');
    });

    it('derives stable sorting config from a primitive key', () => {
      const sorting = {
        initialSort: { field: 'updatedAt', direction: 'desc' as const },
        fields: [
          { field: 'updatedAt', name: 'Last updated' },
          { field: 'title', name: 'Name' },
        ],
      };

      const key = getSortingConfigKey(sorting);

      expect(getSortingConfigKey({ ...sorting, fields: [...sorting.fields].reverse() })).toBe(key);
      expect(getSortingUrlConfigFromKey(key)).toEqual({
        initialSort: { field: 'updatedAt', direction: 'desc' },
        validSortFields: new Set(['title', 'updatedAt']),
      });
    });

    it('returns a primitive initial query text', () => {
      expect(getInitialQueryText({ initialSearch: 'hello' })).toBe('hello');
      expect(getInitialQueryText(true)).toBe('');
    });
  });
});
