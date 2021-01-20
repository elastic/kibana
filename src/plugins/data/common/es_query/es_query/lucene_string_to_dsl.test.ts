/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { luceneStringToDsl } from './lucene_string_to_dsl';

describe('build query', () => {
  describe('luceneStringToDsl', () => {
    test('should wrap strings with an ES query_string query', () => {
      const result = luceneStringToDsl('foo:bar');
      const expectedResult = {
        query_string: { query: 'foo:bar' },
      };

      expect(result).toEqual(expectedResult);
    });

    test('should return a match_all query for empty strings and whitespace', () => {
      const expectedResult = {
        match_all: {},
      };

      expect(luceneStringToDsl('')).toEqual(expectedResult);
      expect(luceneStringToDsl('   ')).toEqual(expectedResult);
    });

    test('should return non-string arguments without modification', () => {
      const expectedResult = {};
      const result = luceneStringToDsl(expectedResult);

      expect(result).toBe(expectedResult);
      expect(result).toEqual(expectedResult);
    });
  });
});
