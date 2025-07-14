/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, lookupIndexFields } from '../../../__tests__/context_fixtures';
import { Location } from '../../types';
import { autocomplete } from './autocomplete';
import {
  expectSuggestions,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  getLiteralsByType,
} from '../../../__tests__/autocomplete';
import { ICommandCallbacks } from '../../types';
import {
  ESQL_NUMBER_TYPES,
  FunctionReturnType,
  FieldType,
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

// types accepted by the AVG function
export const AVG_TYPES: Array<FieldType & FunctionReturnType> = ['double', 'integer', 'long'];

export const EXPECTED_FOR_EMPTY_EXPRESSION = [
  ' = ',
  ...allAggFunctions,
  ...allGroupingFunctions,
  ...allEvalFunctionsForStats,
];

const statsExpectSuggestions = (
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
    'stats',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('STATS Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = {
      getByType: jest.fn(),
      getColumnsForQuery: jest.fn(),
    };

    const expectedFields = getFieldNamesByType('any');
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
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
  describe('STATS ...', () => {
    describe('... <aggregates> ...', () => {
      test('suggestions for a fresh expression', async () => {
        const expected = EXPECTED_FOR_EMPTY_EXPRESSION;

        await statsExpectSuggestions('from a | stats ', expected, mockCallbacks);
        await statsExpectSuggestions('FROM a | STATS ', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=max(b), ', expected, mockCallbacks);
        await statsExpectSuggestions(
          'from a | stats a=max(b) WHERE doubleField > longField, ',
          expected,
          mockCallbacks
        );
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        await statsExpectSuggestions(
          'from a | stats a= ',
          [...allAggFunctions, ...allGroupingFunctions, ...allEvalFunctionsForStats],
          mockCallbacks
        );
      });

      test('on space after aggregate field', async () => {
        await statsExpectSuggestions(
          'from a | stats a=min(b) ',
          ['WHERE ', 'BY ', ', ', '| '],
          mockCallbacks
        );
      });

      test('on function left paren', async () => {
        // set the test functions to include a time series agg function
        // to ensure it is suggested in the stats command
        // this is a workaround for the fact that the time series agg functions
        // are on snapshots atm, remove when they are on tech preview
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
        await statsExpectSuggestions(
          'from a | stats by bucket(',
          [
            ...getFieldNamesByType([...ESQL_COMMON_NUMERIC_TYPES, 'date', 'date_nanos']),
            ...getFunctionSignaturesByReturnType(
              Location.EVAL,
              ['date', 'date_nanos', ...ESQL_COMMON_NUMERIC_TYPES],
              {
                scalar: true,
              }
            ).map((f) => `${f},`),
          ],
          mockCallbacks
        );
        const expectedFieldsRound = getFieldNamesByType(roundParameterTypes);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsRound.map((name) => ({ label: name, text: name }))
        );
        await statsExpectSuggestions(
          'from a | stats round(',
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
        await statsExpectSuggestions(
          'from a | stats round(round(',
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
        await statsExpectSuggestions(
          'from a | stats avg(round(',
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
        await statsExpectSuggestions(
          'from a | stats avg(',
          [
            ...expectedFieldsAvg,
            ...getFunctionSignaturesByReturnType(Location.EVAL, AVG_TYPES, {
              scalar: true,
            }),
          ],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'TS a | stats avg(',
          [...expectedFieldsAvg, 'FUNC($0)'],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'from a | stats round(avg(',
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
            ],
            {
              scalar: true,
            }
          ),
        ];

        await statsExpectSuggestions('from a | stats a=min(', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=min(/b), b=max(', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=min(b), b=max(', expected, mockCallbacks);
      });

      test('inside function argument list', async () => {
        const expectedFieldsAvg = getFieldNamesByType(AVG_TYPES);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsAvg.map((name) => ({ label: name, text: name }))
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by stringField',
          [
            ...getFieldNamesByType(AVG_TYPES),
            ...getFunctionSignaturesByReturnType(Location.EVAL, AVG_TYPES, {
              scalar: true,
            }),
          ],
          mockCallbacks,
          mockContext,
          20
        );
      });

      test('when typing right paren', async () => {
        await statsExpectSuggestions(
          'from a | stats a = min(b) | sort b',
          ['WHERE ', 'BY ', ', ', '| '],
          mockCallbacks,
          mockContext,
          25
        );
      });

      test('increments suggested variable name counter', async () => {
        await statsExpectSuggestions(
          'from a | eval col0=round(b), col1=round(c) | stats ',
          [
            ' = ',
            // TODO verify that this change is ok
            ...allAggFunctions,
            ...allEvalFunctionsForStats,
            ...allGroupingFunctions,
          ],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'from a | stats col0=min(b),col1=c,',
          [' = ', ...allAggFunctions, ...allEvalFunctionsForStats, ...allGroupingFunctions],
          mockCallbacks
        );
      });

      describe('...WHERE expression...', () => {
        it('suggests fields and functions in empty expression', async () => {
          await statsExpectSuggestions(
            'FROM a | STATS MIN(b) WHERE ',
            [
              ...getFieldNamesByType('any'),
              ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { scalar: true }),
            ],
            mockCallbacks
          );
        });

        it('suggests operators after a first operand', async () => {
          await statsExpectSuggestions(
            'FROM a | STATS MIN(b) WHERE keywordField ',
            [
              ...getFunctionSignaturesByReturnType(
                Location.STATS_WHERE,
                'any',
                { operators: true },
                ['keyword']
              ),
            ],
            mockCallbacks
          );
        });

        it('suggests after operator', async () => {
          const expectedFieldsStrings = getFieldNamesByType(['text', 'keyword']);
          (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
            expectedFieldsStrings.map((name) => ({ label: name, text: name }))
          );
          await statsExpectSuggestions(
            'FROM a | STATS MIN(b) WHERE keywordField != ',
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
                'FROM a | STATS MIN(b) WHERE keywordField != keywordField '
              );
              expect(suggestions.map(({ text }) => text)).toContain(suggestion);
            }
          );

          test.each(completedExpressionSuggestions)(
            'does NOT suggest "%s" after complete non-boolean',
            async (suggestion) => {
              const suggestions = await suggest('FROM a | STATS MIN(b) WHERE longField + 1 ');
              expect(suggestions.map(({ text }) => text)).not.toContain(suggestion);
            }
          );
        });

        it('suggests after logical operator', async () => {
          await statsExpectSuggestions(
            `FROM a | STATS AVG(doubleField) WHERE keywordField >= keywordField AND doubleField `,
            [
              ...getFunctionSignaturesByReturnType(
                Location.STATS_WHERE,
                'boolean',
                { operators: true },
                ['double']
              ),
            ],
            mockCallbacks
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

        await statsExpectSuggestions('from a | stats a=max(b) by ', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=max(b) BY ', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=min(b) by ', expected, mockCallbacks);
      });

      test('no grouping functions as args to scalar function', async () => {
        const suggestions = await suggest('FROM a | STATS a=MIN(b) BY ACOS(');
        expect(suggestions.some((s) => allGroupingFunctions.includes(s.text))).toBe(false);
      });

      test('on partial column name', async () => {
        const expected = [
          ' = ',
          getDateHistogramCompletionItem().text,
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ];

        await statsExpectSuggestions(
          'from a | stats a=max(b) BY keywor/',
          [...expected, ...getFieldNamesByType('any')],
          mockCallbacks
        );

        await statsExpectSuggestions(
          'from a | stats a=max(b) BY integerField, keywor',
          [...expected, ...getFieldNamesByType('any')],
          mockCallbacks
        );
      });

      test('on complete column name', async () => {
        await statsExpectSuggestions(
          'from a | stats a=max(b) by integerField',
          [' = ', 'integerField | ', 'integerField, '],
          mockCallbacks
        );

        await statsExpectSuggestions(
          'from a | stats a=max(b) by keywordField, integerField',
          [' = ', 'integerField | ', 'integerField, '],
          mockCallbacks
        );
      });

      test('attaches field range', async () => {
        const suggestions = await suggest('from a | stats a=max(b) by integerF');
        const fieldSuggestion = suggestions.find((s) => s.text === 'integerField');
        expect(fieldSuggestion?.rangeToReplace).toEqual({
          start: 27,
          end: 35,
        });
      });

      test('on space after grouping field', async () => {
        await statsExpectSuggestions('from a | stats a=c by d ', [', ', '| '], mockCallbacks);
      });

      test('after comma "," in grouping fields', async () => {
        const fields = getFieldNamesByType('any');
        await statsExpectSuggestions(
          'from a | stats a=c by d, ',
          [
            ' = ',
            getDateHistogramCompletionItem().text,
            ...fields,
            ...allEvalFunctionsForStats,
            ...allGroupingFunctions,
          ],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'from a | stats a=min(b),',
          [' = ', ...allAggFunctions, ...allEvalFunctionsForStats, ...allGroupingFunctions],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by c, ',
          [
            ' = ',
            getDateHistogramCompletionItem().text,
            ...fields,
            ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
            ...allGroupingFunctions,
          ],
          mockCallbacks
        );
      });

      test('on space before expression right hand side operand', async () => {
        const expectedFieldsNumeric = getFieldNamesByType(['integer', 'double', 'long']);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsNumeric.map((name) => ({ label: name, text: name }))
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by integerField % ',
          [
            ...getFieldNamesByType('integer'),
            ...getFieldNamesByType('double'),
            ...getFieldNamesByType('long'),
            ...getFunctionSignaturesByReturnType(Location.EVAL, ['integer', 'double', 'long'], {
              scalar: true,
            }),
            // categorize is not compatible here
            ...allGroupingFunctions.filter((f) => !f.includes('CATEGORIZE')),
          ],
          mockCallbacks
        );
        const expectedFieldsAny = getFieldNamesByType(['any']);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFieldsAny.map((name) => ({ label: name, text: name }))
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by col0 = ',
          [
            getDateHistogramCompletionItem().text,
            ...getFieldNamesByType('any'),
            ...allEvalFunctionsForStats,
            ...allGroupingFunctions,
          ],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by c, col0 = ',
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
        await statsExpectSuggestions(
          'from a | stats avg(b) by doubleField % 2 ',
          [', ', '| '],
          mockCallbacks
        );

        await statsExpectSuggestions(
          'from a | stats col0 = AVG(doubleField) BY col1 = BUCKET(dateField, 1 day) ',
          [', ', '| '],
          mockCallbacks
        );
      });

      test('on space within bucket()', async () => {
        const expectedFields = getFieldNamesByType([
          'date',
          'date_nanos',
          ...ESQL_COMMON_NUMERIC_TYPES,
        ]);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFields.map((name) => ({ label: name, text: name }))
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by BUCKET(, 50, ?_tstart, ?_tend)',
          [
            // Note there's no space or comma in the suggested field names
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
          32
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by BUCKET( , 50, ?_tstart, ?_tend)',
          [
            // Note there's no space or comma in the suggested field names
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
          32
        );
        const expectedFields1 = getFieldNamesByType([
          'integer',
          'date_period',
          'time_duration',
        ] as FieldType[]);
        (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
          expectedFields1.map((name) => ({ label: name, text: name }))
        );
        await statsExpectSuggestions(
          'from a | stats avg(b) by BUCKET(dateField, 50, ?_tstart, ?_tend)',
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
          43
        );
      });

      test('count(/) to suggest * for all', async () => {
        const suggestions = await suggest('from a | stats count(');
        expect(suggestions).toContain(allStarConstant);
      });

      describe('date histogram snippet', () => {
        test('uses histogramBarTarget preference when available', async () => {
          const expectedCompletionItem = getDateHistogramCompletionItem(50);

          const suggestions = await suggest('FROM a | STATS BY ');

          expect(suggestions).toContainEqual(expectedCompletionItem);
        });
      });
    });
  });
});
