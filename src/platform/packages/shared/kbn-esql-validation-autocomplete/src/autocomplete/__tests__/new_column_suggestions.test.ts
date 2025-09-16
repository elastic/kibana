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
  describe('new-column suggestions', () => {
    describe('across commands', () => {
      test('increments suggestion (EVAL)', async () => {
        const { suggest } = await setup();

        const suggestions = (
          await suggest(
            'FROM a | EVAL col0 = 1 | ENRICH policy ON keywordField WITH col1 = integerField | EVAL /'
          )
        ).map((s) => s.text);

        expect(suggestions).toContain('col2 = ');
        expect(suggestions).not.toContain('col1 = ');
        expect(suggestions).not.toContain('col0 = ');
      });

      test('resets suggestion in commands that reset the fields list (STATS)', async () => {
        const { suggest } = await setup();

        const suggestions = (
          await suggest(
            'FROM a | EVAL col0 = 1 | ENRICH policy ON keywordField WITH col1 = integerField | STATS /'
          )
        ).map((s) => s.text);

        expect(suggestions).toContain('col0 = ');
        expect(suggestions).not.toContain('col1 = ');
        expect(suggestions).not.toContain('col2 = ');
      });
    });

    describe('within single command', () => {
      test('STATS', async () => {
        const { suggest } = await setup();

        const suggestions = (
          await suggest('FROM a | STATS col0 = AVG(integerField), col1 = 3, /')
        ).map((s) => s.text);

        expect(suggestions).toContain('col2 = ');
        expect(suggestions).not.toContain('col1 = ');
        expect(suggestions).not.toContain('col0 = ');
      });

      test('EVAL', async () => {
        const { suggest } = await setup();

        const suggestions = (
          await suggest('FROM a | EVAL col0 = FLOOR(integerField), col1 = 3, /')
        ).map((s) => s.text);

        expect(suggestions).toContain('col2 = ');
        expect(suggestions).not.toContain('col1 = ');
        expect(suggestions).not.toContain('col0 = ');
      });

      test('ROW', async () => {
        const { suggest } = await setup();

        const suggestions = (await suggest('ROW col0 = FLOOR(32), col1 = 3, /')).map((s) => s.text);

        expect(suggestions).toContain('col2 = ');
        expect(suggestions).not.toContain('col1 = ');
        expect(suggestions).not.toContain('col0 = ');
      });

      test.todo('RERANK');
    });
  });
});
