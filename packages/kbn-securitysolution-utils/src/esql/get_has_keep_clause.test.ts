/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getESQLHasKeepClause } from './get_has_keep_clause';

describe('get_has_keep_clause', () => {
  describe('when query has FROM source command', () => {
    test('should return true if query has keep clause', () => {
      const query = 'from some_index | keep _id, _index';
      const result = getESQLHasKeepClause(query);
      expect(result).toEqual(true);
    });

    test('should return true if keep clause is valid even though query has error', () => {
      const query = 'from some_index | keep _id, _index|';
      const result = getESQLHasKeepClause(query);
      expect(result).toEqual(true);
    });

    test('should return false if query has no keep clause', () => {
      const query = 'from some_index';
      const result = getESQLHasKeepClause(query);
      expect(result).toEqual(false);
    });

    test('should return false if it has keep clause but query is invalid ', () => {
      const query = 'from some_index keep _id, _index ';
      const result = getESQLHasKeepClause(query);
      expect(result).toEqual(false);
    });
  });

  describe('when query has any source command other than FROM', () => {
    test('should return false', () => {
      const query = 'ROW col1="value1", col2="value2"';
      const result = getESQLHasKeepClause(query);
      expect(result).toEqual(false);
    });
  });
});
