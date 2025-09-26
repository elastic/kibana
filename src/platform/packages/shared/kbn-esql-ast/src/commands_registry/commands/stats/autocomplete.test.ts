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
import { autocomplete } from './autocomplete';
import {
  DATE_DIFF_TIME_UNITS,
  expectSuggestions,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  getLiteralsByType,
  mockFieldsWithTypes,
  suggest as testSuggest,
} from '../../../__tests__/autocomplete';
import type { ICommandCallbacks, ISuggestionItem } from '../../types';
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

// types accepted by the AVG function
export const AVG_TYPES: Array<FieldType & FunctionReturnType> = ['double', 'integer', 'long'];

export const EXPECTED_FOR_FIRST_EMPTY_EXPRESSION = [
  'BY ',
  ' = ',
  ...allAggFunctions,
  ...allGroupingFunctions,
  ...allEvalFunctionsForStats,
];

export const EXPECTED_FOR_EMPTY_EXPRESSION = [
  ' = ',
  ...allAggFunctions,
  ...allGroupingFunctions,
  ...allEvalFunctionsForStats,
];

type ExpectedStats =
  | string[]
  | {
      contains?: string[];
      notContains?: string[];
      containsItems?: ISuggestionItem[];
      noCommaFor?: string[];
      hasAnyComma?: boolean;
    };

const statsExpectSuggestions = async (
  query: string,
  expected: ExpectedStats,
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  if (Array.isArray(expected)) {
    return expectSuggestions(
      query,
      expected,
      context,
      'stats',
      mockCallbacks,
      autocomplete,
      offset
    );
  }

  const results = await testSuggest(query, context, 'stats', mockCallbacks, autocomplete, offset);
  const texts = results.map(({ text }) => text);

  if (expected.contains?.length) {
    expect(texts).toEqual(expect.arrayContaining(expected.contains));
  }

  if (expected.notContains?.length) {
    expected.notContains.forEach((suggestion) => expect(texts).not.toContain(suggestion));
  }

  if (expected.containsItems?.length) {
    expect(results).toEqual(expect.arrayContaining(expected.containsItems));
  }

  if (expected.noCommaFor?.length) {
    const set = new Set(expected.noCommaFor);
    const subset = results.filter(({ text }) => set.has(text));

    subset.forEach(({ text }) => expect(text).not.toContain(','));
  }

  if (expected.hasAnyComma) {
    expect(results.some(({ text }) => text.endsWith(','))).toBe(true);
  }
};

describe('STATS Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
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
  describe('STATS ...', () => {
    afterEach(() => setTestFunctions([]));

    describe('... <aggregates> ...', () => {
      test('suggestions for a fresh expression', async () => {
        await statsExpectSuggestions('from a | stats ', EXPECTED_FOR_FIRST_EMPTY_EXPRESSION);
        await statsExpectSuggestions('FROM a | STATS ', EXPECTED_FOR_FIRST_EMPTY_EXPRESSION);
        await statsExpectSuggestions('from a | stats a=max(b), ', EXPECTED_FOR_EMPTY_EXPRESSION);
        await statsExpectSuggestions(
          'from a | stats a=max(b) WHERE doubleField > longField, ',
          EXPECTED_FOR_EMPTY_EXPRESSION
        );
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        await statsExpectSuggestions('from a | stats a= ', [
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvalFunctionsForStats,
        ]);
      });

      test('on space after aggregate field', async () => {
        await statsExpectSuggestions('from a | stats a=min(integerField) ', [
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

        await statsExpectSuggestions('FROM index1 | STATS AVG(doubleField) WHE', [
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

        await statsExpectSuggestions('FROM index1 | STATS AVG(doubleField) B', [
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

        mockFieldsWithTypes(mockCallbacks, expectedFields);
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
            ).map((functionName) => `${functionName},`),
          ],
          mockCallbacks
        );
        const expectedFieldsRound = getFieldNamesByType(roundParameterTypes);
        mockFieldsWithTypes(mockCallbacks, expectedFieldsRound);
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
              Location.STATS,
              ESQL_NUMBER_TYPES,
              { scalar: true },
              undefined,
              ['round']
            ),
          ],
          mockCallbacks
        );
        const expectedFieldsAvg = getFieldNamesByType(AVG_TYPES);
        mockFieldsWithTypes(mockCallbacks, expectedFieldsAvg);
        await statsExpectSuggestions(
          'from a | stats avg(',
          [
            ...expectedFieldsAvg,
            ...getFunctionSignaturesByReturnType(Location.STATS, AVG_TYPES, {
              scalar: true,
            }),
          ],
          mockCallbacks
        );
        await statsExpectSuggestions(
          'TS a | stats avg(',
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
        mockFieldsWithTypes(mockCallbacks, expectedFields);
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

        await statsExpectSuggestions('from a | stats a=min(', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=min(/b), b=max(', expected, mockCallbacks);
        await statsExpectSuggestions('from a | stats a=min(b), b=max(', expected, mockCallbacks);
      });

      test('inside function argument list', async () => {
        const expectedFieldsAvg = getFieldNamesByType(AVG_TYPES);
        mockFieldsWithTypes(mockCallbacks, expectedFieldsAvg);
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
          'from a | stats a = min(integerField) | sort b',
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
          36
        );
      });

      test('increments suggested variable name counter', async () => {
        await statsExpectSuggestions(
          'from a | eval col0=round(b), col1=round(c) | stats ',
          EXPECTED_FOR_FIRST_EMPTY_EXPRESSION
        );
        await statsExpectSuggestions(
          'from a | stats col0=min(b),col1=c,',
          EXPECTED_FOR_EMPTY_EXPRESSION
        );
      });

      test('expressions with aggregates', async () => {
        await statsExpectSuggestions('from a | stats col0 = min(integerField) ', [
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
        await statsExpectSuggestions('from a | stats col0 = min(integerField) + ', [
          ...getFunctionSignaturesByReturnType(Location.STATS, ['integer', 'double', 'long'], {
            scalar: true,
            agg: true,
            grouping: true,
          }),
        ]);
      });

      describe('...WHERE expression...', () => {
        it('suggests fields and functions in empty expression', async () => {
          await statsExpectSuggestions('FROM a | STATS MIN(b) WHERE ', [
            ...getFieldNamesByType('any'),
            ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { scalar: true }),
          ]);
        });

        it('suggests operators after a first operand', async () => {
          await statsExpectSuggestions('FROM a | STATS MIN(b) WHERE keywordField ', [
            ...getFunctionSignaturesByReturnType(Location.STATS_WHERE, 'any', { operators: true }, [
              'keyword',
            ]),
          ]);
        });

        it('suggests after operator', async () => {
          const expectedFieldsStrings = getFieldNamesByType(['text', 'keyword']);
          mockFieldsWithTypes(mockCallbacks, expectedFieldsStrings);
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
              await statsExpectSuggestions(
                'FROM a | STATS MIN(b) WHERE keywordField != keywordField ',
                { contains: [suggestion] }
              );
            }
          );

          test.each(completedExpressionSuggestions)(
            'does NOT suggest "%s" after complete non-boolean',
            async (suggestion) => {
              await statsExpectSuggestions('FROM a | STATS MIN(b) WHERE longField + 1 ', {
                notContains: [suggestion],
              });
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

        await statsExpectSuggestions('from a | stats a=max(b) by ', expected);
        await statsExpectSuggestions('from a | stats a=max(b) BY ', expected);
        await statsExpectSuggestions('from a | stats a=min(b) by ', expected);
      });

      test('no grouping functions as args to scalar function', async () => {
        await statsExpectSuggestions('FROM a | STATS a=MIN(b) BY ACOS(', {
          notContains: allGroupingFunctions,
        });
      });

      test('on partial column name', async () => {
        const expected = [
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
          getDateHistogramCompletionItem().text,
          ' = ',
        ];

        await statsExpectSuggestions('from a | stats a=max(b) BY keywor', [
          ...expected,
          ...getFieldNamesByType('any'),
        ]);

        await statsExpectSuggestions('from a | stats a=max(b) BY integerField, keywor', [
          ...expected,
          ...getFieldNamesByType('any'),
        ]);
      });

      test('on complete column name', async () => {
        await statsExpectSuggestions('from a | stats a=max(b) by integerField', [
          'integerField | ',
          'integerField, ',
        ]);

        await statsExpectSuggestions('from a | stats a=max(b) by col0 = integerField', [
          'integerField | ',
          'integerField, ',
        ]);

        await statsExpectSuggestions('from a | stats a=max(b) by keywordField, integerField', [
          'integerField | ',
          'integerField, ',
        ]);

        await statsExpectSuggestions(
          'from a | stats a=max(b) by keywordField, col0 = integerField',
          ['integerField | ', 'integerField, ']
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
        await statsExpectSuggestions('from a | stats a=c by keywordField ', [
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
        await statsExpectSuggestions('from a | stats a=c by CATEGORIZE(keywordField) ', [
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

      test('after comma "," in grouping fields', async () => {
        const fields = getFieldNamesByType('any');
        await statsExpectSuggestions('from a | stats a=c by d, ', [
          ' = ',
          getDateHistogramCompletionItem().text,
          ...fields,
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ]);
        await statsExpectSuggestions('from a | stats a=min(b),', [
          ' = ',
          ...allAggFunctions,
          ...allEvalFunctionsForStats,
          ...allGroupingFunctions,
        ]);
        await statsExpectSuggestions('from a | stats avg(b) by c, ', [
          ' = ',
          getDateHistogramCompletionItem().text,
          ...fields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
          ...allGroupingFunctions,
        ]);
      });

      test('on space before expression right hand side operand', async () => {
        const expectedFieldsNumeric = getFieldNamesByType(['integer', 'double', 'long']);
        mockFieldsWithTypes(mockCallbacks, expectedFieldsNumeric);
        await statsExpectSuggestions(
          'from a | stats avg(b) by integerField % ',
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
        mockFieldsWithTypes(mockCallbacks, expectedFieldsAny);
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
        await statsExpectSuggestions('from a | stats avg(b) by doubleField % 2 ', [
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

        await statsExpectSuggestions(
          'from a | stats col0 = AVG(doubleField) BY col1 = BUCKET(dateField, 1 day) ',
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
        await statsExpectSuggestions(
          'FROM logs-apache_error | STATS count() by keywordField <= textField NOT ',
          ['LIKE $0', 'RLIKE $0', 'IN $0']
        );
      });

      test('within bucket()', async () => {
        const expectedFields = getFieldNamesByType([
          'date',
          'date_nanos',
          ...ESQL_COMMON_NUMERIC_TYPES,
        ]);
        mockFieldsWithTypes(mockCallbacks, expectedFields);
        await statsExpectSuggestions(
          'FROM a | STATS COUNT() BY BUCKET(, 50, ?_tstart, ?_tend)',
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
          33
        );
        await statsExpectSuggestions(
          'FROM a | STATS COUNT() BY BUCKET( , 50, ?_tstart, ?_tend)',
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
          33
        );
        const expectedFields1 = getFieldNamesByType([
          'integer',
          'date_period',
          'time_duration',
        ] as FieldType[]);
        mockFieldsWithTypes(mockCallbacks, expectedFields1);
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
          43 // at the second argument of the bucket function
        );
      });

      test('count(/) to suggest * for all', async () => {
        await statsExpectSuggestions('from a | stats count(', {
          containsItems: [allStarConstant],
        });
      });

      describe('date histogram snippet', () => {
        test('uses histogramBarTarget preference when available', async () => {
          const expectedCompletionItem = getDateHistogramCompletionItem(50);
          await statsExpectSuggestions('FROM a | STATS BY ', {
            containsItems: [expectedCompletionItem],
          });
        });
      });

      describe('expressions in function arguments', () => {
        test('suggests operators after field in function', async () => {
          await statsExpectSuggestions('FROM a | STATS avg(doubleField ', [
            ...getFunctionSignaturesByReturnType(
              Location.STATS,
              'any',
              { operators: true, skipAssign: true },
              ['double']
            ),
          ]);
        });

        test('suggests fields and functions after operator in function', async () => {
          await statsExpectSuggestions('FROM a | STATS avg(doubleField + ', {
            contains: ['doubleField', 'ABS($0)', 'ROUND($0)'],
          });
        });

        test('nested functions in aggregation - suggests fields', async () => {
          await statsExpectSuggestions('FROM a | STATS sum(abs(', {
            contains: ['doubleField', 'integerField', 'longField'],
          });
        });

        test('complex expression in BY clause', async () => {
          await statsExpectSuggestions('FROM a | STATS count() BY bucket(dateField, ', {
            contains: ['1 day', '1 hour'],
          });
        });

        test('comma suggestion in function with multiple mandatory params', async () => {
          await statsExpectSuggestions('FROM a | STATS percentile(doubleField', {
            hasAnyComma: true,
          });
        });

        test('second arg for PERCENTILE is constant-only (no fields suggested)', async () => {
          const numericFields = getFieldNamesByType(['integer', 'long', 'double']);
          mockFieldsWithTypes(mockCallbacks, numericFields);
          await statsExpectSuggestions('FROM a | STATS PERCENTILE(longField, ', {
            notContains: numericFields,
          });
        });

        test('parenthesized argument allows arithmetic operators', async () => {
          await statsExpectSuggestions('FROM a | STATS avg((doubleField) ', [
            ...getFunctionSignaturesByReturnType(
              Location.STATS,
              'any',
              { operators: true, skipAssign: true },
              ['double']
            ),
          ]);
        });

        test('no comma when cursor followed by comma', async () => {
          await statsExpectSuggestions('FROM a | STATS count() BY BUCKET(', {
            noCommaFor: ['dateField', 'doubleField'],
          });
        });
      });
    });
  });

  describe('function parameter constraints', () => {
    it('constantOnly constraint - DATE_DIFF in aggregation should suggest only constants', async () => {
      await statsExpectSuggestions(
        'from a | stats total = SUM(DATE_DIFF(',
        DATE_DIFF_TIME_UNITS,
        mockCallbacks
      );
    });

    it('constantOnly constraint - DATE_DIFF in WHERE clause should suggest only constants', async () => {
      await statsExpectSuggestions(
        'from a | stats count() WHERE DATE_DIFF(',
        DATE_DIFF_TIME_UNITS,
        mockCallbacks
      );
    });
  });
});
