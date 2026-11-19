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
  getSortDirectionsByFieldFromKey,
  mergeAndStringify,
  queryTextCodec,
  sortCodec,
} from './url_codec';
import type { SortDirectionsByField } from '../sorting';

const initialSort = { field: 'title', direction: 'asc' as const };
const directions = (...values: Array<'asc' | 'desc'>) => new Set(values);
const sortDirectionsByField: SortDirectionsByField = new Map([
  ['title', directions('asc', 'desc')],
  ['updatedAt', directions('asc', 'desc')],
]);

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
        sortCodec(sortDirectionsByField, initialSort).encode({
          field: 'updatedAt',
          direction: 'desc',
        })
      ).toEqual({ sort: 'updatedAt:desc' });
    });

    it('omits the resolved initial sort', () => {
      expect(sortCodec(sortDirectionsByField, initialSort).encode(initialSort)).toEqual({
        sort: undefined,
      });
    });

    it('decodes valid sort', () => {
      expect(
        sortCodec(sortDirectionsByField, initialSort).decode({ sort: 'updatedAt:asc' })
      ).toEqual({
        field: 'updatedAt',
        direction: 'asc',
      });
    });

    it('drops unknown sort fields and warns', () => {
      const onUnknown = jest.fn();

      expect(
        sortCodec(sortDirectionsByField, initialSort, onUnknown).decode({ sort: 'foo:asc' })
      ).toBeUndefined();
      expect(onUnknown).toHaveBeenCalledWith('foo:asc');
    });

    it('drops malformed sort and warns', () => {
      const onUnknown = jest.fn();

      expect(
        sortCodec(sortDirectionsByField, initialSort, onUnknown).decode({ sort: 'updatedAt' })
      ).toBeUndefined();
      expect(onUnknown).toHaveBeenCalledWith('updatedAt');
    });

    it('drops a direction the field does not offer and warns', () => {
      const onUnknown = jest.fn();
      const offered: SortDirectionsByField = new Map([['accessedAt', directions('desc')]]);

      expect(
        sortCodec(offered, initialSort, onUnknown).decode({ sort: 'accessedAt:asc' })
      ).toBeUndefined();
      expect(onUnknown).toHaveBeenCalledWith('accessedAt:asc');
    });

    it('accepts the offered direction of a restricted field', () => {
      const offered: SortDirectionsByField = new Map([['accessedAt', directions('desc')]]);

      expect(sortCodec(offered, initialSort).decode({ sort: 'accessedAt:desc' })).toEqual({
        field: 'accessedAt',
        direction: 'desc',
      });
    });
  });

  describe('state helpers', () => {
    it('decodes new-shape state', () => {
      expect(
        decodeNewShape('?q=dashboard&sort=updatedAt%3Adesc', sortDirectionsByField, initialSort)
      ).toEqual({
        queryText: 'dashboard',
        sort: { field: 'updatedAt', direction: 'desc' },
      });
    });

    it('ignores an unsupported direction in new-shape state', () => {
      expect(
        decodeNewShape(
          '?q=dashboard&sort=accessedAt%3Aasc',
          new Map([['accessedAt', directions('desc')]]),
          initialSort
        )
      ).toEqual({ queryText: 'dashboard' });
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
      expect(getSortDirectionsByFieldFromKey(key)).toEqual(
        new Map([
          ['title', directions('asc', 'desc')],
          ['updatedAt', directions('asc', 'desc')],
        ])
      );
    });

    it('returns a primitive initial query text', () => {
      expect(getInitialQueryText({ initialSearch: 'hello' })).toBe('hello');
      expect(getInitialQueryText(true)).toBe('');
    });

    describe('offered sort options', () => {
      const getOffered = (sorting: Parameters<typeof getSortingConfigKey>[0]) =>
        getSortDirectionsByFieldFromKey(getSortingConfigKey(sorting));

      it('offers only the allowed directions of a field', () => {
        const offered = getOffered({
          fields: [
            { field: 'title', name: 'Name' },
            { field: 'accessedAt', name: 'Recently viewed', allowedDirections: ['desc'] },
          ],
        });

        expect(offered).toEqual(
          new Map([
            ['title', directions('asc', 'desc')],
            ['accessedAt', directions('desc')],
          ])
        );
      });

      it('derives the offered options from `options` when `fields` is not set', () => {
        const offered = getOffered({
          options: [
            { label: 'Name A-Z', field: 'title', direction: 'asc' },
            { label: 'Newest', field: 'updatedAt', direction: 'desc' },
          ],
        });

        expect(offered).toEqual(
          new Map([
            ['title', directions('asc')],
            ['updatedAt', directions('desc')],
          ])
        );
      });

      it.each([
        ['an empty key', ''],
        ['an entry without a direction', 'title'],
        ['an unknown direction', 'title:sideways'],
        ['a field containing a colon', 'a:b:asc'],
      ])('ignores %s', (_, key) => {
        expect(getSortDirectionsByFieldFromKey(key)).toEqual(new Map());
      });
    });
  });
});
