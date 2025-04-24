/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { FieldType, FunctionReturnType, Location } from '../../definitions/types';
import { ESQL_COMMON_NUMERIC_TYPES, ESQL_NUMBER_TYPES } from '../../shared/esql_types';
import { getDateHistogramCompletionItem } from '../commands/stats/util';
import { allStarConstant } from '../complete_items';
import { roundParameterTypes } from './constants';
import {
  setup,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
  getLiteralsByType,
  AssertSuggestionsFn,
  SuggestFn,
} from './helpers';

const allAggFunctions = getFunctionSignaturesByReturnType(Location.STATS, 'any', {
  agg: true,
});

const allEvaFunctions = getFunctionSignaturesByReturnType(
  Location.STATS,
  'any',
  {
    scalar: true,
    grouping: false,
  },
  undefined,
  undefined,
  'by'
);

const allGroupingFunctions = getFunctionSignaturesByReturnType(
  Location.STATS,
  'any',
  {
    grouping: true,
  },
  undefined,
  undefined,
  'by'
);

// types accepted by the AVG function
const avgTypes: Array<FieldType & FunctionReturnType> = ['double', 'integer', 'long'];

describe('autocomplete.suggest', () => {
  describe('STATS <aggregates> [ BY <grouping> ]', () => {
    let assertSuggestions: AssertSuggestionsFn;
    let suggest: SuggestFn;
    beforeEach(async () => {
      const res = await setup();
      assertSuggestions = res.assertSuggestions;
      suggest = res.suggest;
    });

    describe('... <aggregates> ...', () => {
      test('suggestions for a fresh expression', async () => {
        const expected = [
          'var0 = ',
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvaFunctions,
        ];

        await assertSuggestions('from a | stats /', expected);
        await assertSuggestions('FROM a | STATS /', expected);
        await assertSuggestions('from a | stats a=max(b), /', expected);
        await assertSuggestions(
          'from a | stats a=max(b) WHERE doubleField > longField, /',
          expected
        );
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        await assertSuggestions('from a | stats a=/', [
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvaFunctions,
        ]);
      });

      test('on space after aggregate field', async () => {
        await assertSuggestions('from a | stats a=min(b) /', ['WHERE ', 'BY ', ', ', '| ']);
      });

      test('on function left paren', async () => {
        await assertSuggestions('from a | stats by bucket(/', [
          ...getFieldNamesByType([...ESQL_COMMON_NUMERIC_TYPES, 'date', 'date_nanos']).map(
            (field) => `${field}, `
          ),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
            {
              scalar: true,
            }
          ).map((s) => ({ ...s, text: `${s.text},` })),
        ]);
        await assertSuggestions('from a | stats round(/', [
          ...getFunctionSignaturesByReturnType(Location.STATS, roundParameterTypes, {
            agg: true,
          }),
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            roundParameterTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
        await assertSuggestions('from a | stats round(round(/', [
          ...getFunctionSignaturesByReturnType(Location.STATS, roundParameterTypes, { agg: true }),
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ESQL_NUMBER_TYPES,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
        await assertSuggestions('from a | stats avg(round(/', [
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ESQL_NUMBER_TYPES,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
        await assertSuggestions('from a | stats avg(/', [
          ...getFieldNamesByType(avgTypes),
          ...getFunctionSignaturesByReturnType(Location.EVAL, avgTypes, {
            scalar: true,
          }),
        ]);
        await assertSuggestions('from a | stats round(avg(/', [
          ...getFieldNamesByType(avgTypes),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            avgTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
      });

      test('when typing inside function left paren', async () => {
        const expected = [
          ...getFieldNamesByType([
            ...ESQL_COMMON_NUMERIC_TYPES,
            'date',
            'date_nanos',
            'boolean',
            'ip',
            'version',
            'text',
            'keyword',
          ]),
          ...getFunctionSignaturesByReturnType(
            Location.STATS,
            [
              ...ESQL_COMMON_NUMERIC_TYPES,
              'date',
              'boolean',
              'ip',
              'version',
              'text',
              'keyword',
              'date_nanos',
            ],
            {
              scalar: true,
            }
          ),
        ];

        await assertSuggestions('from a | stats a=min(/)', expected);
        await assertSuggestions('from a | stats a=min(/b), b=max()', expected);
        await assertSuggestions('from a | stats a=min(b), b=max(/)', expected);
      });

      test('inside function argument list', async () => {
        await assertSuggestions('from a | stats avg(b/) by stringField', [
          ...getFieldNamesByType(avgTypes),
          ...getFunctionSignaturesByReturnType(Location.EVAL, avgTypes, {
            scalar: true,
          }),
        ]);
      });

      test('when typing right paren', async () => {
        await assertSuggestions('from a | stats a = min(b)/ | sort b', [
          'WHERE ',
          'BY ',
          ', ',
          '| ',
        ]);
      });

      test('increments suggested variable name counter', async () => {
        await assertSuggestions('from a | eval var0=round(b), var1=round(c) | stats /', [
          'var2 = ',
          // TODO verify that this change is ok
          ...allAggFunctions,
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats var0=min(b),var1=c,/', [
          'var2 = ',
          ...allAggFunctions,
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
      });

      describe('...WHERE expression...', () => {
        it('suggests fields and functions in empty expression', async () => {
          await assertSuggestions('FROM a | STATS MIN(b) WHERE /', [
            ...getFieldNamesByType('any').map((name) => `${name} `),
            ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { scalar: true }),
          ]);
        });

        it('suggests operators after a first operand', async () => {
          await assertSuggestions('FROM a | STATS MIN(b) WHERE keywordField /', [
            ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { operators: true }, [
              'keyword',
            ]),
          ]);
        });

        it('suggests after operator', async () => {
          await assertSuggestions('FROM a | STATS MIN(b) WHERE keywordField != /', [
            ...getFieldNamesByType(['boolean', 'text', 'keyword']),
            ...getFunctionSignaturesByReturnType(
              Location.STATS_WHERE,
              ['boolean', 'text', 'keyword'],
              { scalar: true }
            ),
          ]);
        });

        describe('completed expression suggestions', () => {
          const completedExpressionSuggestions = ['| ', ', ', 'BY '];

          test.each(completedExpressionSuggestions)(
            'suggests "%s" after complete boolean expression',
            async (suggestion) => {
              const suggestions = await suggest(
                'FROM a | STATS MIN(b) WHERE keywordField != keywordField /'
              );
              expect(suggestions.map(({ text }) => text)).toContain(suggestion);
            }
          );

          test.each(completedExpressionSuggestions)(
            'does NOT suggest "%s" after complete non-boolean',
            async (suggestion) => {
              const suggestions = await suggest('FROM a | STATS MIN(b) WHERE longField + 1 /');
              expect(suggestions.map(({ text }) => text)).not.toContain(suggestion);
            }
          );
        });

        it('suggests after logical operator', async () => {
          await assertSuggestions(
            `FROM a | STATS AVG(doubleField) WHERE keywordField >= keywordField AND doubleField /`,
            [
              ...getFunctionSignaturesByReturnType(
                Location.STATS_WHERE,
                'boolean',
                { operators: true },
                ['double']
              ),
            ]
          );
        });

        describe('Parity with WHERE command', () => {
          it('matches WHERE suggestions after a keyword expression', async () => {
            const expression = 'keywordField';

            const suggestions = await suggest(`FROM a | WHERE ${expression} /`);

            expect(suggestions).not.toHaveLength(0);

            await assertSuggestions(
              `FROM a | STATS AVG(longField) WHERE ${expression} /`,
              suggestions
                .map(({ text }) => text)
                // match operator not yet supported, see https://github.com/elastic/elasticsearch/issues/116261
                .filter((text) => text !== ': $0')
            );
          });

          it('matches WHERE suggestions after a boolean expression', async () => {
            const expression = 'longField > longField';

            const suggestions = await suggest(`FROM a | WHERE ${expression} /`);

            expect(suggestions).not.toHaveLength(0);

            await assertSuggestions(
              `FROM a | STATS AVG(longField) WHERE ${expression} /`,
              suggestions
                .map(({ text }) => text)
                // A couple extra goodies in STATS ... WHERE
                .concat([', ', 'BY '])
            );
          });
        });
      });
    });

    describe('... BY <grouping>', () => {
      test('on space after "BY" keyword', async () => {
        const expected = [
          'var0 = ',
          getDateHistogramCompletionItem(),
          ...getFieldNamesByType('any').map((field) => `${field} `),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ];

        await assertSuggestions('from a | stats a=max(b) by /', expected);
        await assertSuggestions('from a | stats a=max(b) BY /', expected);
        await assertSuggestions('from a | stats a=min(b) by /', expected);
      });

      test('on space after grouping field', async () => {
        await assertSuggestions('from a | stats a=c by d /', [', ', '| ']);
      });

      test('after comma "," in grouping fields', async () => {
        const fields = getFieldNamesByType('any').map((field) => `${field} `);
        await assertSuggestions('from a | stats a=c by d, /', [
          'var0 = ',
          getDateHistogramCompletionItem(),
          ...fields,
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats a=min(b),/', [
          'var0 = ',
          ...allAggFunctions,
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats avg(b) by c, /', [
          'var0 = ',
          getDateHistogramCompletionItem(),
          ...fields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
          ...allGroupingFunctions,
        ]);
      });

      test('on space before expression right hand side operand', async () => {
        await assertSuggestions('from a | stats avg(b) by integerField % /', [
          ...getFieldNamesByType('integer'),
          ...getFieldNamesByType('double'),
          ...getFieldNamesByType('long'),
          ...getFunctionSignaturesByReturnType(Location.EVAL, ['integer', 'double', 'long'], {
            scalar: true,
          }),
          // categorize is not compatible here
          ...allGroupingFunctions.filter((f) => !f.text.includes('CATEGORIZE')),
        ]);
        await assertSuggestions('from a | stats avg(b) by var0 = /', [
          getDateHistogramCompletionItem(),
          ...getFieldNamesByType('any').map((field) => `${field} `),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats avg(b) by c, var0 = /', [
          getDateHistogramCompletionItem(),
          ...getFieldNamesByType('any').map((field) => `${field} `),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
      });

      test('on space after expression right hand side operand', async () => {
        await assertSuggestions('from a | stats avg(b) by doubleField % 2 /', [', ', '| '], {
          triggerCharacter: ' ',
        });

        await assertSuggestions(
          'from a | stats var0 = AVG(doubleField) BY var1 = BUCKET(dateField, 1 day) /',
          [', ', '| '],
          { triggerCharacter: ' ' }
        );
      });

      test('on space within bucket()', async () => {
        await assertSuggestions('from a | stats avg(b) by BUCKET(/, 50, ?_tstart, ?_tend)', [
          // Note there's no space or comma in the suggested field names
          ...getFieldNamesByType(['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES]),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
            {
              scalar: true,
            }
          ),
        ]);
        await assertSuggestions('from a | stats avg(b) by BUCKET(  /  , 50, ?_tstart, ?_tend)', [
          // Note there's no space or comma in the suggested field names
          ...getFieldNamesByType(['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES]),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
            {
              scalar: true,
            }
          ),
        ]);

        await assertSuggestions(
          'from a | stats avg(b) by BUCKET(dateField, /50, ?_tstart, ?_tend)',
          [
            ...getLiteralsByType('time_literal'),
            ...getFunctionSignaturesByReturnType(Location.EVAL, ['integer', 'date_period'], {
              scalar: true,
            }),
          ]
        );
      });

      test('count(/) to suggest * for all', async () => {
        const suggestions = await suggest('from a | stats count(/)');
        expect(suggestions).toContain(allStarConstant);
      });

      describe('date histogram snippet', () => {
        test('uses histogramBarTarget preference when available', async () => {
          const histogramBarTarget = Math.random() * 100;
          const expectedCompletionItem = getDateHistogramCompletionItem(histogramBarTarget);

          const suggestions = await suggest('FROM a | STATS BY /', {
            callbacks: { getPreferences: () => Promise.resolve({ histogramBarTarget }) },
          });

          expect(suggestions).toContainEqual(expectedCompletionItem);
        });

        test('defaults gracefully', async () => {
          const expectedCompletionItem = getDateHistogramCompletionItem();

          const suggestions = await suggest('FROM a | STATS BY /');

          expect(suggestions).toContainEqual(expectedCompletionItem);
        });
      });

      describe('create control suggestion', () => {
        test('suggests `Create control` option for aggregations', async () => {
          const suggestions = await suggest('FROM a | STATS /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariables: () => [],
              getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
            },
          });

          expect(suggestions).toContainEqual({
            label: 'Create control',
            text: '',
            kind: 'Issue',
            detail: 'Click to create',
            command: { id: 'esql.control.functions.create', title: 'Click to create' },
            sortText: '1',
          });
        });

        test('suggests `??function` option', async () => {
          const suggestions = await suggest('FROM a | STATS var0 = /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariables: () => [
                {
                  key: 'function',
                  value: 'avg',
                  type: ESQLVariableType.FUNCTIONS,
                },
              ],
              getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
            },
          });

          expect(suggestions).toContainEqual({
            label: '??function',
            text: '??function',
            kind: 'Constant',
            detail: 'Named parameter',
            command: undefined,
            sortText: '1A',
          });
        });

        test('suggests `Create control` option for grouping', async () => {
          const suggestions = await suggest('FROM a | STATS BY /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariables: () => [],
              getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
            },
          });

          expect(suggestions).toContainEqual({
            label: 'Create control',
            text: '',
            kind: 'Issue',
            detail: 'Click to create',
            command: { id: 'esql.control.fields.create', title: 'Click to create' },
            sortText: '11',
          });
        });

        test('suggests `??field` option', async () => {
          const suggestions = await suggest('FROM a | STATS BY /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariables: () => [
                {
                  key: 'field',
                  value: 'clientip',
                  type: ESQLVariableType.FIELDS,
                },
              ],
              getColumnsFor: () => Promise.resolve([{ name: 'clientip', type: 'ip' }]),
            },
          });

          expect(suggestions).toContainEqual({
            label: '??field',
            text: '??field',
            kind: 'Constant',
            detail: 'Named parameter',
            command: undefined,
            sortText: '11A',
          });
        });

        test('suggests `?interval` option', async () => {
          const suggestions = await suggest('FROM index_a | STATS BY BUCKET(@timestamp, /)', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariables: () => [
                {
                  key: 'interval',
                  value: '1 hour',
                  type: ESQLVariableType.TIME_LITERAL,
                },
              ],
              getColumnsFor: () => Promise.resolve([{ name: '@timestamp', type: 'date' }]),
            },
          });

          expect(suggestions).toContainEqual({
            label: '?interval',
            text: '?interval',
            kind: 'Constant',
            detail: 'Named parameter',
            command: undefined,
            sortText: '1A',
          });
        });

        test('suggests `Create control` option when ? is being typed', async () => {
          const suggestions = await suggest('FROM index_b | STATS PERCENTILE(bytes, ?/)', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariables: () => [],
              getColumnsFor: () => Promise.resolve([{ name: 'bytes', type: 'double' }]),
            },
          });

          expect(suggestions).toContainEqual({
            label: 'Create control',
            text: '',
            kind: 'Issue',
            detail: 'Click to create',
            command: { id: 'esql.control.values.create', title: 'Click to create' },
            sortText: '1',
          });
        });
      });
    });
  });
});
