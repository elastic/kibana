/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('new-column suggestion incrementing', () => {
    test.each([
      'FROM a | EVAL col0 = 1 | ENRICH policy ON keywordField WITH col1 = integerField | EVAL /',
      'FROM a | EVAL col0 = 1 | ENRICH policy ON keywordField WITH col1 = integerField | STATS /',
      // even though DROP removes the columns, they still count for the purposes of naming new columns
      'FROM a | EVAL col0 = 1, col1 = 1 | DROP col0, col1 | EVAL /',
      // even though STATS removes the columns, they still count for the purposes of naming new columns
      'FROM a | EVAL col0 = 1, col1 = 1 | STATS COUNT() | STATS /',
    ])('across commands', async (query) => {
      const { suggest } = await setup();

      const suggestions = (await suggest(query)).map((s) => s.text);

      expect(suggestions).toContain('col2 = ');
      expect(suggestions).not.toContain('col1 = ');
      expect(suggestions).not.toContain('col0 = ');
    });

    test.each([
      'FROM a | STATS col0 = AVG(integerField), col1 = 3, /',
      'FROM a | EVAL col0 = FLOOR(integerField), col1 = 3, /',
      'ROW col0 = FLOOR(32), col1 = 3, /',
    ])('within single command', async (query) => {
      const { suggest } = await setup();

      const suggestions = (await suggest(query)).map((s) => s.text);

      expect(suggestions).toContain('col2 = ');
      expect(suggestions).not.toContain('col1 = ');
      expect(suggestions).not.toContain('col0 = ');
    });

    test.todo('RERANK');
  });
});
