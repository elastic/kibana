/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldWildcardFilter, makeRegEx } from './field_wildcard';

describe('fieldWildcard', () => {
  const metaFields = ['_id', '_type', '_source'];

  describe('makeRegEx', function () {
    it('matches * in any position', function () {
      expect(makeRegEx('*a*b*c*').matches('aaaaaabbbbbbbcccccc')).toBe(true);
      expect(makeRegEx('*1234').matches('a1234')).toBe(true);
      expect(makeRegEx('1234*').matches('1234a')).toBe(true);
      expect(makeRegEx('12a34').matches('12a34')).toBe(true);
    });

    it('properly escapes regexp control characters', function () {
      expect(makeRegEx('account[*]').matches('account[user_id]')).toBe(true);
    });

    it('properly limits matches without wildcards', function () {
      expect(makeRegEx('*name').matches('username')).toBe(true);
      expect(makeRegEx('user*').matches('username')).toBe(true);
      expect(makeRegEx('username').matches('username')).toBe(true);
      expect(makeRegEx('user').matches('username')).toBe(false);
      expect(makeRegEx('name').matches('username')).toBe(false);
      expect(makeRegEx('erna').matches('username')).toBe(false);
    });
  });

  describe('filter', function () {
    it('filters nothing when given undefined', function () {
      const filter = fieldWildcardFilter();
      const original = ['foo', 'bar', 'baz', 1234];

      expect(original.filter((val) => filter(val))).toEqual(original);
    });

    it('filters nothing when given an empty array', function () {
      const filter = fieldWildcardFilter([], metaFields);
      const original = ['foo', 'bar', 'baz', 1234];

      expect(original.filter(filter)).toEqual(original);
    });

    it('does not filter metaFields', function () {
      const filter = fieldWildcardFilter(['_*'], metaFields);

      const original = ['_id', '_type', '_typefake'];

      expect(original.filter(filter)).toEqual(['_id', '_type']);
    });

    it('filters values that match the globs', function () {
      const filter = fieldWildcardFilter(['f*', '*4'], metaFields);

      const original = ['foo', 'bar', 'baz', 1234];

      expect(original.filter(filter)).toEqual(['bar', 'baz']);
    });

    it('handles weird values okay', function () {
      const filter = fieldWildcardFilter(['f*', '*4', 'undefined'], metaFields);

      const original = ['foo', null, 'bar', undefined, {}, [], 'baz', 1234];

      expect(original.filter(filter)).toEqual([null, 'bar', {}, [], 'baz']);
    });
  });
});
