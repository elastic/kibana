/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Location } from '../../definitions/types';
import { ESQL_STRING_TYPES } from '../../shared/esql_types';
import { EXPECTED_FIELD_AND_FUNCTION_SUGGESTIONS } from './autocomplete.command.sort.test';
import { AVG_TYPES, EXPECTED_FOR_EMPTY_EXPRESSION } from './autocomplete.command.stats.test';
import {
  EMPTY_WHERE_SUGGESTIONS,
  EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS,
} from './autocomplete.command.where.test';
import {
  AssertSuggestionsFn,
  SuggestFn,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  setup,
} from './helpers';

describe('autocomplete.suggest', () => {
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
        const FORK_SUBCOMMANDS = ['WHERE ', 'SORT ', 'LIMIT ', 'DISSECT ', 'STATS ', 'EVAL '];

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

          test('dissect', async () => {
            await assertSuggestions(
              'FROM a | FORK (DISSECT /)',
              getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `)
            );
            await assertSuggestions('FROM a | FORK (DISSECT keywordField /)', ['"%{firstWord}" ']);
            await assertSuggestions('FROM a | FORK (DISSECT keywordField "" /)', [
              'APPEND_SEPARATOR = ',
              '| ',
            ]);
          });

          describe('stats', () => {
            it('suggests for empty expression', async () => {
              await assertSuggestions('FROM a | FORK (STATS /)', EXPECTED_FOR_EMPTY_EXPRESSION);
              await assertSuggestions(
                'FROM a | FORK (STATS AVG(integerField), /)',
                EXPECTED_FOR_EMPTY_EXPRESSION
              );
            });

            it('suggest within a function', async () => {
              await assertSuggestions('FROM a | FORK (STATS AVG(/))', [
                ...getFieldNamesByType(AVG_TYPES),
                ...getFunctionSignaturesByReturnType(Location.STATS, AVG_TYPES, { scalar: true }),
              ]);
              await assertSuggestions('FROM a | FORK (STATS AVG(integerField) BY ACOS(/))', [
                ...getFieldNamesByType([...AVG_TYPES, 'unsigned_long']),
                ...getFunctionSignaturesByReturnType(
                  Location.STATS,
                  [...AVG_TYPES, 'unsigned_long'],
                  {
                    scalar: true,
                    // grouping functions are a bug: https://github.com/elastic/kibana/issues/218319
                    grouping: true,
                  },
                  undefined,
                  ['acos']
                ),
              ]);
            });

            it('supports STATS ... WHERE', async () => {
              await assertSuggestions(
                'FROM a | FORK (STATS AVG(integerField) WHERE integerField /)',
                [
                  ...getFunctionSignaturesByReturnType(
                    Location.STATS_WHERE,
                    'any',
                    { operators: true },
                    ['integer']
                  ),
                ]
              );
            });
          });

          describe('eval', () => {
            it('suggests for empty expression', async () => {
              const emptyExpressionSuggestions = [
                'var0 = ',
                ...getFieldNamesByType('any').map((name) => `${name} `),
                ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
              ];
              await assertSuggestions('FROM a | FORK (EVAL /)', emptyExpressionSuggestions);
              await assertSuggestions(
                'FROM a | FORK (EVAL ACOS(integerField), /)',
                emptyExpressionSuggestions
              );
            });

            it('suggests within a function', async () => {
              await assertSuggestions('FROM a | FORK (EVAL ACOS(/))', [
                ...getFieldNamesByType(['integer', 'long', 'unsigned_long', 'double']),
                ...getFunctionSignaturesByReturnType(
                  Location.STATS,
                  ['integer', 'long', 'unsigned_long', 'double'],
                  {
                    scalar: true,
                  },
                  undefined,
                  ['acos']
                ),
              ]);
            });
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
          await assertSuggestsPipe(
            'FROM a | FORK (DISSECT keywordField "%{firstWord}" APPEND_SEPARATOR=":" /)'
          );
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

        describe('user-defined columns', () => {
          it('suggests user-defined columns from earlier in this branch', async () => {
            const suggestions = await suggest(
              'FROM a | FORK (EVAL foo = 1 | EVAL bar = 2 | WHERE /)'
            );
            expect(suggestions.map(({ text }) => text)).toContain('foo');
            expect(suggestions.map(({ text }) => text)).toContain('bar');
          });

          it('does NOT suggest user-defined columns from another branch', async () => {
            const suggestions = await suggest('FROM a | FORK (EVAL foo = 1) (WHERE /)');
            expect(suggestions.map(({ text }) => text)).not.toContain('foo');
          });

          it('suggests user-defined columns from all branches after FORK', async () => {
            const suggestions = await suggest(
              'FROM a | FORK (EVAL foo = 1) (EVAL bar = 2) | WHERE /'
            );
            expect(suggestions.map(({ text }) => text)).not.toContain('foo');
            expect(suggestions.map(({ text }) => text)).not.toContain('bar');
          });
        });
      });
    });
  });
});
