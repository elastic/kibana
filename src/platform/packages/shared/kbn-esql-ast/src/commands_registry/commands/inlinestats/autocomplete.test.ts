/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  mockContext,
  lookupIndexFields,
  getMockCallbacks,
} from '../../../__tests__/context_fixtures';
import { Location } from '../../types';
import { autocomplete } from '../stats/autocomplete';
import {
  expectSuggestions,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  getLiteralsByType,
} from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';
import type { FunctionReturnType, FieldType } from '../../../definitions/types';
import {
  ESQL_NUMBER_TYPES,
  FunctionDefinitionTypes,
  ESQL_COMMON_NUMERIC_TYPES,
} from '../../../definitions/types';
import { correctQuerySyntax, findAstPosition } from '../../../definitions/utils/ast';
import { parse } from '../../../parser';
import { setTestFunctions } from '../../../definitions/utils/test_functions';
import { allStarConstant, getDateHistogramCompletionItem } from '../../../..';

const roundParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;
const allAggFunctions = getFunctionSignaturesByReturnType(Location.STATS, 'any', {
  agg: true,
});

const allEvalFunctionsForStats = getFunctionSignaturesByReturnType(
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

export const EXPECTED_FIELD_AND_FUNCTION_SUGGESTIONS = [
  ...getFieldNamesByType('any'),
  ...getFunctionSignaturesByReturnType(Location.SORT, 'any', {
    scalar: true,
  }),
];

export const AVG_TYPES: Array<FieldType & FunctionReturnType> = ['double', 'integer', 'long'];
export const EXPECTED_FOR_EMPTY_EXPRESSION = [
  ' = ',
  ...allAggFunctions,
  ...allGroupingFunctions,
  ...allEvalFunctionsForStats,
];

const inlineStatsExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'inlinestats',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('INLINESTATS Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });

  const suggest = async (query: string) => {
    const correctedQuery = correctQuerySyntax(query);
    const { ast } = parse(correctedQuery, { withFormatting: true });
    const cursorPosition = query.length;
    const { command } = findAstPosition(ast, cursorPosition);
    if (!command) {
      throw new Error('Command not found in the parsed query');
    }
    return autocomplete(query, command, mockCallbacks, mockContext, cursorPosition);
  };
  describe('INLINESTATS ...', () => {
    afterEach(() => setTestFunctions([]));

    describe('... <aggregates> ...', () => {
      test('suggestions for a fresh expression', async () => {
        const expected = EXPECTED_FOR_EMPTY_EXPRESSION;

        await inlineStatsExpectSuggestions('from a | inlinestats ', expected);
        await inlineStatsExpectSuggestions('FROM a | INLINESTATS ', expected);
        await inlineStatsExpectSuggestions('from a | inlinestats a=max(b), ', expected);
        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=max(b) WHERE doubleField > longField, ',
          expected
        );
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        await inlineStatsExpectSuggestions('from a | inlinestats a= ', [
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvalFunctionsForStats,
        ]);
      });

      test('on space after aggregate field', async () => {
        await inlineStatsExpectSuggestions('from a | inlinestats a=min(integerField) ', [
          'WHERE ',
          'BY ',
          ', ',
          '| ',
          ...getFunctionSignaturesByReturnType(
            Location.STATS,
            'any',
            { operators: true, skipAssign: true },
            ['integer']
          ),
        ]);

        await inlineStatsExpectSuggestions('FROM index1 | INLINESTATS AVG(doubleField) WHE', [
          'WHERE ',
          'BY ',
          ', ',
          '| ',
          ...getFunctionSignaturesByReturnType(
            Location.STATS,
            'any',
            { operators: true, skipAssign: true },
            ['double']
          ),
        ]);

        await inlineStatsExpectSuggestions('FROM index1 | INLINESTATS AVG(doubleField) B', [
          'WHERE ',
          'BY ',
          ', ',
          '| ',
          ...getFunctionSignaturesByReturnType(
            Location.STATS,
            'any',
            { operators: true, skipAssign: true },
            ['double']
          ),
        ]);
      });

      test('on function left paren', async () => {
        setTestFunctions([
          {
            type: FunctionDefinitionTypes.TIME_SERIES_AGG,
            name: 'func',
            description: '',
            signatures: [
              {
                params: [
                  {
                    name: 'field',
                    type: 'counter_double',
                    optional: false,
                  },
                ],
                returnType: 'double',
              },
              {
                params: [
                  {
                    name: 'field',
                    type: 'counter_integer',
                    optional: false,
                  },
                ],
                returnType: 'double',
              },
              {
                params: [
                  {
                    name: 'field',
                    type: 'counter_long',
                    optional: false,
                  },
                ],
                returnType: 'double',
              },
            ],
            locationsAvailable: [Location.STATS_TIMESERIES],
          },
        ]);
        const expectedFields = getFieldNamesByType([
          ...ESQL_COMMON_NUMERIC_TYPES,
          'date',
          'date_nanos',
        ]);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFields.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats by bucket(',
          [
            ...getFieldNamesByType([...ESQL_COMMON_NUMERIC_TYPES, 'date', 'date_nanos']),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
              {
                scalar: true,
              }
            ).map((f) => `${f},`),
            ...getFunctionSignaturesByReturnType(
              Location.STATS,
              ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
              {
                agg: true,
              }
            ).map((f) => `${f},`),
          ],
          mockCallbacks
        );
        const expectedFieldsRound = getFieldNamesByType(roundParameterTypes);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsRound.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats round(',
          [
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
          ],
          mockCallbacks
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats round(round(',
          [
            ...getFunctionSignaturesByReturnType(Location.STATS, roundParameterTypes, {
              agg: true,
            }),
            ...getFieldNamesByType(roundParameterTypes),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ESQL_NUMBER_TYPES,
              { scalar: true },
              undefined,
              ['round']
            ),
          ],
          mockCallbacks
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(round(',
          [
            ...getFieldNamesByType(roundParameterTypes),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ESQL_NUMBER_TYPES,
              { scalar: true },
              undefined,
              ['round']
            ),
          ],
          mockCallbacks
        );
        const expectedFieldsAvg = getFieldNamesByType(AVG_TYPES);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsAvg.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(',
          [
            ...expectedFieldsAvg,
            ...getFunctionSignaturesByReturnType(Location.STATS, AVG_TYPES, {
              scalar: true,
            }),
          ],
          mockCallbacks
        );
        await inlineStatsExpectSuggestions(
          'TS a | inlinestats avg(',
          [
            ...expectedFieldsAvg,
            ...getFunctionSignaturesByReturnType(
              [Location.STATS, Location.STATS_TIMESERIES],
              AVG_TYPES,
              {
                scalar: true,
                timeseriesAgg: true,
              }
            ),
            'FUNC($0)',
          ],
          mockCallbacks
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats round(avg(',
          [
            ...expectedFieldsAvg,
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              AVG_TYPES,
              { scalar: true },
              undefined,
              ['round']
            ),
          ],
          mockCallbacks
        );
      });

      test('when typing inside function left paren', async () => {
        const expectedFields = getFieldNamesByType([
          ...ESQL_COMMON_NUMERIC_TYPES,
          'date',
          'date_nanos',
          'boolean',
          'ip',
          'version',
          'text',
          'keyword',
        ]);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFields.map((name) => ({ label: name, text: name }))
        );
        const expected = [
          ...expectedFields,
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
              'unsigned_long',
            ],
            {
              scalar: true,
            }
          ),
        ];

        await inlineStatsExpectSuggestions('from a | inlinestats a=min(', expected, mockCallbacks);
        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=min(/b), b=max(',
          expected,
          mockCallbacks
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=min(b), b=max(',
          expected,
          mockCallbacks
        );
      });

      test('inside function argument list', async () => {
        const expectedFieldsAvg = getFieldNamesByType(AVG_TYPES);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsAvg.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(b) by stringField',
          [
            ...getFieldNamesByType(AVG_TYPES),
            ...getFunctionSignaturesByReturnType(Location.EVAL, AVG_TYPES, {
              scalar: true,
            }),
          ],
          mockCallbacks,
          mockContext,
          26
        );
      });

      test('when typing right paren', async () => {
        await inlineStatsExpectSuggestions(
          'from a | inlinestats a = min(integerField) | sort b',
          [
            'WHERE ',
            'BY ',
            ', ',
            '| ',
            ...getFunctionSignaturesByReturnType(
              Location.STATS,
              'any',
              { operators: true, skipAssign: true },
              ['integer']
            ),
          ],
          mockCallbacks,
          mockContext,
          42
        );
      });

      test('increments suggested variable name counter', async () => {
        await inlineStatsExpectSuggestions(
          'from a | eval col0=round(b), col1=round(c) | inlinestats ',
          [
            ' = ',
            // TODO verify that this change is ok
            ...allAggFunctions,
            ...allEvalFunctionsForStats,
            ...allGroupingFunctions,
          ]
        );
        await inlineStatsExpectSuggestions('from a | inlinestats col0=min(b),col1=c,', [
          ' = ',
          ...allAggFunctions,
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ]);
      });

      test('expressions with aggregates', async () => {
        await inlineStatsExpectSuggestions('from a | inlinestats col0 = min(integerField) ', [
          'BY ',
          'WHERE ',
          '| ',
          ', ',
          ...getFunctionSignaturesByReturnType(
            Location.STATS,
            'any',
            { operators: true, skipAssign: true },
            ['integer']
          ),
        ]);
        await inlineStatsExpectSuggestions('from a | inlinestats col0 = min(integerField) + ', [
          ...getFunctionSignaturesByReturnType(Location.STATS, ['integer', 'double', 'long'], {
            scalar: true,
            agg: true,
            grouping: true,
          }),
        ]);
      });

      describe('...WHERE expression...', () => {
        it('suggests fields and functions in empty expression', async () => {
          await inlineStatsExpectSuggestions('FROM a | INLINESTATS MIN(b) WHERE ', [
            ...getFieldNamesByType('any'),
            ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { scalar: true }),
          ]);
        });

        it('suggests operators after a first operand', async () => {
          await inlineStatsExpectSuggestions('FROM a | INLINESTATS MIN(b) WHERE keywordField ', [
            ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { operators: true }, [
              'keyword',
            ]),
          ]);
        });

        it('suggests after operator', async () => {
          const expectedFieldsStrings = getFieldNamesByType(['text', 'keyword']);
          (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
            expectedFieldsStrings.map((name) => ({ label: name, text: name }))
          );
          await inlineStatsExpectSuggestions(
            'FROM a | INLINESTATS MIN(b) WHERE keywordField != ',
            [
              ...expectedFieldsStrings,
              ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, ['text', 'keyword'], {
                scalar: true,
              }),
            ],
            mockCallbacks
          );
        });

        describe('completed expression suggestions', () => {
          const completedExpressionSuggestions = ['| ', ', ', 'BY '];

          test.each(completedExpressionSuggestions)(
            'suggests "%s" after complete boolean expression',
            async (suggestion) => {
              const suggestions = await suggest(
                'FROM a | INLINESTATS MIN(b) WHERE keywordField != keywordField '
              );
              expect(suggestions.map(({ text }) => text)).toContain(suggestion);
            }
          );

          test.each(completedExpressionSuggestions)(
            'does NOT suggest "%s" after complete non-boolean',
            async (suggestion) => {
              const suggestions = await suggest('FROM a | INLINESTATS MIN(b) WHERE longField + 1 ');
              expect(suggestions.map(({ text }) => text)).not.toContain(suggestion);
            }
          );
        });

        it('suggests after logical operator', async () => {
          await inlineStatsExpectSuggestions(
            `FROM a | INLINESTATS AVG(doubleField) WHERE keywordField >= keywordField AND doubleField `,
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
      });
    });

    describe('... BY <grouping>', () => {
      test('on space after "BY" keyword', async () => {
        const expected = [
          ' = ',
          getDateHistogramCompletionItem().text,
          ...getFieldNamesByType('any'),
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ];

        await inlineStatsExpectSuggestions('from a | inlinestats a=max(b) by ', expected);
        await inlineStatsExpectSuggestions('from a | inlinestats a=max(b) BY ', expected);
        await inlineStatsExpectSuggestions('from a | inlinestats a=min(b) by ', expected);
      });

      test('no grouping functions as args to scalar function', async () => {
        const suggestions = await suggest('FROM a | INLINESTATS a=MIN(b) BY ACOS(');
        expect(suggestions.some((s) => allGroupingFunctions.includes(s.text))).toBe(false);
      });

      test('on partial column name', async () => {
        const expected = [
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
          getDateHistogramCompletionItem().text,
          ' = ',
        ];

        await inlineStatsExpectSuggestions('from a | inlinestats a=max(b) BY keywor', [
          ...expected,
          ...getFieldNamesByType('any'),
        ]);

        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=max(b) BY integerField, keywor',
          [...expected, ...getFieldNamesByType('any')]
        );
      });

      test('on complete column name', async () => {
        await inlineStatsExpectSuggestions('from a | inlinestats a=max(b) by integerField', [
          'integerField | ',
          'integerField, ',
        ]);

        await inlineStatsExpectSuggestions('from a | inlinestats a=max(b) by col0 = integerField', [
          'integerField | ',
          'integerField, ',
        ]);

        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=max(b) by keywordField, integerField',
          ['integerField | ', 'integerField, ']
        );

        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=max(b) by keywordField, col0 = integerField',
          ['integerField | ', 'integerField, ']
        );
      });

      test('attaches field range', async () => {
        const suggestions = await suggest('from a | INLINESTATS a=max(b) by integerF');
        const fieldSuggestion = suggestions.find((s) => s.text === 'integerField');
        expect(fieldSuggestion?.rangeToReplace).toEqual({
          start: 33,
          end: 41,
        });
      });

      test('on space after grouping field', async () => {
        await inlineStatsExpectSuggestions('from a | inlinestats a=c by keywordField ', [
          ', ',
          '| ',
          ...getFunctionSignaturesByReturnType(
            Location.STATS_BY,
            'any',
            {
              operators: true,
              skipAssign: true,
            },
            ['keyword']
          ),
        ]);
      });

      test('on space after grouping function', async () => {
        await inlineStatsExpectSuggestions(
          'from a | inlinestats a=c by CATEGORIZE(keywordField) ',
          [
            ', ',
            '| ',
            ...getFunctionSignaturesByReturnType(
              Location.STATS_BY,
              'any',
              {
                operators: true,
                skipAssign: true,
              },
              ['keyword']
            ),
          ]
        );
      });

      test('after comma "," in grouping fields', async () => {
        const fields = getFieldNamesByType('any');
        await inlineStatsExpectSuggestions('from a | inlinestats a=c by d, ', [
          ' = ',
          getDateHistogramCompletionItem().text,
          ...fields,
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ]);
        await inlineStatsExpectSuggestions('from a | inlinestats a=min(b),', [
          ' = ',
          ...allAggFunctions,
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ]);
        await inlineStatsExpectSuggestions('from a | inlinestats avg(b) by c, ', [
          ' = ',
          getDateHistogramCompletionItem().text,
          ...fields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
          ...allGroupingFunctions,
        ]);
      });

      test('on space before expression right hand side operand', async () => {
        const expectedFieldsNumeric = getFieldNamesByType(['integer', 'double', 'long']);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsNumeric.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(b) by integerField % ',
          [
            ...getFieldNamesByType('integer'),
            ...getFieldNamesByType('double'),
            ...getFieldNamesByType('long'),
            ...getFunctionSignaturesByReturnType(Location.EVAL, ['integer', 'double', 'long'], {
              scalar: true,
            }),
            // Filter out functions that are not compatible with this context
            ...allGroupingFunctions.filter(
              (f) => !['CATEGORIZE', 'TBUCKET'].some((incompatible) => f.includes(incompatible))
            ),
          ],
          mockCallbacks
        );
        const expectedFieldsAny = getFieldNamesByType(['any']);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsAny.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(b) by col0 = ',
          [
            getDateHistogramCompletionItem().text,
            ...getFieldNamesByType('any'),
            ...allEvalFunctionsForStats,
            ...allGroupingFunctions,
          ],
          mockCallbacks
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(b) by c, col0 = ',
          [
            getDateHistogramCompletionItem().text,
            ...getFieldNamesByType('any'),
            ...allEvalFunctionsForStats,
            ...allGroupingFunctions,
          ],
          mockCallbacks
        );
      });

      test('on space after expression right hand side operand', async () => {
        await inlineStatsExpectSuggestions('from a | inlinestats avg(b) by doubleField % 2 ', [
          ', ',
          '| ',
          ...getFunctionSignaturesByReturnType(
            Location.STATS_BY,
            'any',
            {
              operators: true,
              skipAssign: true,
            },
            ['double']
          ),
        ]);

        await inlineStatsExpectSuggestions(
          'from a | inlinestats col0 = AVG(doubleField) BY col1 = BUCKET(dateField, 1 day) ',
          [
            ', ',
            '| ',
            ...getFunctionSignaturesByReturnType(
              Location.STATS_BY,
              'any',
              {
                operators: true,
                skipAssign: true,
              },
              ['date']
            ),
          ]
        );
      });

      test('after NOT keyword', async () => {
        await inlineStatsExpectSuggestions(
          'FROM logs-apache_error | INLINESTATS count() by keywordField <= textField NOT ',
          ['LIKE $0', 'RLIKE $0', 'IN $0']
        );
      });

      test('within bucket()', async () => {
        const expectedFields = getFieldNamesByType([
          'date',
          'date_nanos',
          ...ESQL_COMMON_NUMERIC_TYPES,
        ]);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFields.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'FROM a | INLINESTATS COUNT() BY BUCKET(, 50, ?_tstart, ?_tend)',
          [
            ...getFieldNamesByType(['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES]),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
              {
                scalar: true,
              }
            ),
          ],
          mockCallbacks,
          mockContext,
          39
        );
        await inlineStatsExpectSuggestions(
          'FROM a | INLINESTATS COUNT() BY BUCKET( , 50, ?_tstart, ?_tend)',
          [
            ...getFieldNamesByType(['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES]),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
              {
                scalar: true,
              }
            ),
          ],
          mockCallbacks,
          mockContext,
          39
        );
        const expectedFields1 = getFieldNamesByType([
          'integer',
          'date_period',
          'time_duration',
        ] as FieldType[]);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFields1.map((name) => ({ label: name, text: name }))
        );
        await inlineStatsExpectSuggestions(
          'from a | inlinestats avg(b) by BUCKET(dateField, 50, ?_tstart, ?_tend)',
          [
            ...getLiteralsByType('time_duration'),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ['integer', 'date_period', 'time_duration'],
              {
                scalar: true,
              }
            ),
            ...['integerField', 'integerPrompt'],
          ],
          mockCallbacks,
          mockContext,
          49
        );
      });

      test('count(/) to suggest * for all', async () => {
        const suggestions = await suggest('from a | INLINESTATS count(');
        expect(suggestions).toContain(allStarConstant);
      });

      describe('date histogram snippet', () => {
        test('uses histogramBarTarget preference when available', async () => {
          const expectedCompletionItem = getDateHistogramCompletionItem(50);

          const suggestions = await suggest('FROM a | INLINESTATS BY ');

          expect(suggestions).toContainEqual(expectedCompletionItem);
        });
      });
    });
  });
});
