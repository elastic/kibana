/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  fieldNameWildcardMatcher,
  getFieldSearchMatchingHighlight,
} from './field_name_wildcard_matcher';

const name = 'test.this_value.maybe';
describe('fieldNameWildcardMatcher', function () {
  describe('fieldNameWildcardMatcher()', () => {
    it('should work correctly with wildcard', async () => {
      expect(fieldNameWildcardMatcher({ displayName: 'test', name: 'test' }, 'no')).toBe(false);
      expect(fieldNameWildcardMatcher({ displayName: 'test', name: 'yes' }, 'yes')).toBe(true);

      const search = 'test*ue';
      expect(fieldNameWildcardMatcher({ displayName: 'test', name: 'test' }, search)).toBe(false);
      expect(
        fieldNameWildcardMatcher({ displayName: 'test.value', name: 'test.value' }, search)
      ).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'test.this_value' }, search)).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'message.test' }, search)).toBe(false);
      expect(fieldNameWildcardMatcher({ name }, search)).toBe(false);
      expect(fieldNameWildcardMatcher({ name }, `${search}*`)).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, '*value*')).toBe(true);
    });

    it('should work correctly with spaces', async () => {
      expect(fieldNameWildcardMatcher({ name }, 'test maybe    ')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'test maybe*')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'test. this')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'this      _value be')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'test')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'this')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, '  value  ')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'be')).toBe(true);
      expect(fieldNameWildcardMatcher({ name }, 'test this here')).toBe(false);
      expect(fieldNameWildcardMatcher({ name }, 'test that')).toBe(false);
      expect(fieldNameWildcardMatcher({ name }, '    ')).toBe(false);
      expect(fieldNameWildcardMatcher({ name: 'geo.location3' }, '3')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'geo_location3' }, 'geo 3')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      expect(fieldNameWildcardMatcher({ name: 'Test' }, 'test')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'test' }, 'Test')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' }, 'Tes*')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' }, 'tes*')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' }, 't T')).toBe(true);
      expect(fieldNameWildcardMatcher({ name: 'tesT' }, 't t')).toBe(true);
    });

    describe('fuzzy search', () => {
      test('only matches strings longer than 3 characters', () => {
        expect(fieldNameWildcardMatcher({ name: 'a' }, 'b')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'ab' }, 'cb')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'abc' }, 'abb')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'abcd' }, 'abbd')).toBe(true);
      });
      test('is case insensitive', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefg' }, 'AAbcdef')).toBe(true);
      });
      test('tests both displayName and name', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefg' }, 'aabcdefg')).toBe(true);
        expect(
          fieldNameWildcardMatcher({ name: 'abcdefg', displayName: 'irrelevantstring' }, 'bbcdefg')
        ).toBe(true);
        expect(
          fieldNameWildcardMatcher({ name: 'irrelevantstring', displayName: 'abcdefg' }, 'bbcdefg')
        ).toBe(true);
      });
      test('finds matches with a typo at the beginning of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmno' }, '.bcdefghijklmno')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmno' }, '.bcde')).toBe(true);
      });
      test('finds matches with a typo in the middle of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmno' }, 'abcdefghi.klmno')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmno' }, 'ghi.klm')).toBe(true);
      });
      test('finds matches with a typo at the end of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmno' }, 'abcdefghijklmn.')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmno' }, 'klmn.')).toBe(true);
      });
      test('finds matches with an additional character at the beginning of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, '.abcdefghijklmn')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, '.abcde')).toBe(true);
      });
      test('finds matches with an additional character in the middle of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, 'abcdefgh.ijklmn')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, 'fgh.ijklm')).toBe(true);
      });
      test('finds matches with an additional character at the end of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, 'abcdefghijklmn.')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, 'ghijklmn.')).toBe(true);
      });
      test('finds matches with a missing character in the middle of the string', () => {
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, 'abcdefgijklmn')).toBe(true);
        expect(fieldNameWildcardMatcher({ name: 'abcdefghijklmn' }, 'gijkl')).toBe(true);
      });
      test('does not find matches exceeding edit distance 1', () => {
        // swapping edit distance = 2
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'abdcefhghijklm')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'abdce')).toBe(false);
        // 2 char removed
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'abcfhghijklm')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'abcfhg')).toBe(false);
        // 2 chars added
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'abcfhghijklmmm')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'hijklmmm')).toBe(false);
        // 2 typos
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'cccdefhghijklm')).toBe(false);
        expect(fieldNameWildcardMatcher({ name: 'abcdefhghijklm' }, 'cccdefh')).toBe(false);
      });
    });
  });

  describe('getFieldSearchMatchingHighlight()', function () {
    it('should correctly return only partial match', async () => {
      expect(getFieldSearchMatchingHighlight('test this', 'test')).toBe('test');
      expect(getFieldSearchMatchingHighlight('test this', 'this')).toBe('this');
      expect(getFieldSearchMatchingHighlight('test this')).toBe('');
    });

    it('should correctly return a match for a wildcard search', async () => {
      expect(getFieldSearchMatchingHighlight('Test this', 'test*')).toBe('test');
      expect(getFieldSearchMatchingHighlight('test this', '*this')).toBe(' this');
      expect(getFieldSearchMatchingHighlight('test this', ' te th')).toBe('t th');
    });
  });
});
