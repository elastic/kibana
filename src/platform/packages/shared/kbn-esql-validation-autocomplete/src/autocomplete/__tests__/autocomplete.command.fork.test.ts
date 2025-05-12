/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EXPECTED_FIELD_AND_FUNCTION_SUGGESTIONS } from './autocomplete.command.sort.test';
import {
  EMPTY_WHERE_SUGGESTIONS,
  EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS,
} from './autocomplete.command.where.test';
import { AssertSuggestionsFn, SuggestFn, setup } from './helpers';

describe.skip('autocomplete.suggest', () => {
  describe('FORK (COMMAND ... [| COMMAND ...]) [(COMMAND ... [| COMMAND ...])]', () => {
    let assertSuggestions: AssertSuggestionsFn;
    let suggest: SuggestFn;
    beforeEach(async function () {
      const result = await setup();
      assertSuggestions = result.assertSuggestions;
      suggest = result.suggest;
    });

    describe('FORK ...', () => {
      test('suggests new branch on empty command', async () => {
        await assertSuggestions('FROM a | FORK /', [{ text: '($0)', asSnippet: true }]);
        await assertSuggestions('FROM a | fork /', [{ text: '($0)', asSnippet: true }]);
      });

      test('suggests pipe and new branch after complete branch', async () => {
        await assertSuggestions('FROM a | FORK (LIMIT 100) /', [{ text: '($0)', asSnippet: true }]);
        await assertSuggestions('FROM a | FORK (LIMIT 100) (SORT keywordField ASC) /', [
          { text: '($0)', asSnippet: true },
          '| ',
        ]);
      });

      describe('(COMMAND ... | COMMAND ...)', () => {
        const FORK_SUBCOMMANDS = ['WHERE ', 'SORT ', 'LIMIT '];

        it('suggests FORK sub commands in an open branch', async () => {
          await assertSuggestions('FROM a | FORK (/)', FORK_SUBCOMMANDS);
          await assertSuggestions('FROM a | FORK (WHERE 1) (/)', FORK_SUBCOMMANDS);
        });

        describe('delegation to subcommands', () => {
          test('where', async () => {
            await assertSuggestions('FROM a | FORK (WHERE /)', EMPTY_WHERE_SUGGESTIONS);
            await assertSuggestions('FROM a | FORK (WHERE key/)', EMPTY_WHERE_SUGGESTIONS);
            await assertSuggestions(
              'FROM a | FORK (WHERE textField != /)',
              EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS
            );
            await assertSuggestions(
              'FROM a | FORK (WHERE textField != text/)',
              EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS
            );
          });

          test('limit', async () => {
            await assertSuggestions('FROM a | FORK (LIMIT /)', ['10 ', '100 ', '1000 ']);
          });

          test('sort', async () => {
            await assertSuggestions(
              'FROM a | FORK (SORT /)',
              EXPECTED_FIELD_AND_FUNCTION_SUGGESTIONS
            );
            await assertSuggestions('FROM a | FORK (SORT integerField /)', [
              'ASC',
              'DESC',
              ', ',
              '| ',
              'NULLS FIRST',
              'NULLS LAST',
            ]);
          });
        });

        it('suggests pipe after complete subcommands', async () => {
          const assertSuggestsPipe = async (query: string) => {
            const suggestions = await suggest(query);
            expect(suggestions.map(({ text }) => text)).toContain('| ');
          };

          await assertSuggestsPipe('FROM a | FORK (WHERE keywordField IS NOT NULL /)');
          await assertSuggestsPipe('FROM a | FORK (LIMIT 1234 /)');
          await assertSuggestsPipe('FROM a | FORK (SORT keywordField ASC /)');
        });

        it('suggests FORK subcommands after in-branch pipe', async () => {
          await assertSuggestions('FROM a | FORK (LIMIT 1234 | /)', FORK_SUBCOMMANDS);
          await assertSuggestions(
            'FROM a | FORK (WHERE keywordField IS NULL | LIMIT 1234 | /)',
            FORK_SUBCOMMANDS
          );
          await assertSuggestions(
            'FROM a | FORK (SORT longField ASC NULLS LAST) (WHERE keywordField IS NULL | LIMIT 1234 | /)',
            FORK_SUBCOMMANDS
          );
        });
      });
    });
  });
});
