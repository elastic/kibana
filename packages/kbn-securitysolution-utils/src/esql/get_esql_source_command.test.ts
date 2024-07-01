/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getESQLSourceCommand } from './get_esql_source_command';

describe('get_esql_source_command', () => {
  describe('when correct source command is supplied', () => {
    const candidateQueries = ['from some_index', 'ROW col1="value1", col2="value2"', 'SHOW item'];
    const results = ['from', 'row', 'show'];
    candidateQueries.forEach((query, index) => {
      it(`should return correct source command with query : ${query}`, () => {
        const result = getESQLSourceCommand(query);
        expect(result).toEqual(results[index]);
      });
    });
  });
  describe('when incorrect source command is supplied', () => {
    it('should return undefined if no source command', () => {
      const query = 'random command';
      const result = getESQLSourceCommand(query);
      expect(result).toEqual(undefined);
    });
  });
});
