/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, getMockCallbacks } from '../../../__tests__/context_fixtures';
import { Location } from '../../types';
import { autocomplete } from './autocomplete';
import {
  expectSuggestions,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
} from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';
import { ESQL_COMMON_NUMERIC_TYPES } from '../../../definitions/types';
import { getDateLiterals } from '../../../definitions/utils';
import { correctQuerySyntax, findAstPosition } from '../../../definitions/utils/ast';
import { parse } from '../../../parser';

const allEvalFns = getFunctionSignaturesByReturnType(Location.WHERE, 'any', {
  scalar: true,
});

export const EMPTY_WHERE_SUGGESTIONS = [...getFieldNamesByType('any'), ...allEvalFns];

export const EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS = [
  ...getFieldNamesByType(['text', 'keyword', 'ip', 'version']),
  ...getFunctionSignaturesByReturnType(Location.WHERE, ['text', 'keyword', 'ip', 'version'], {
    scalar: true,
  }),
];

const whereExpectSuggestions = (
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
    'where',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('WHERE Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = getMockCallbacks();
  });
  test('beginning an expression', async () => {
    await whereExpectSuggestions('from a | where ', EMPTY_WHERE_SUGGESTIONS);
    await whereExpectSuggestions('from a | eval col0 = 1 | where ', [
      ...getFieldNamesByType('any'),
      ...allEvalFns,
    ]);
  });

  describe('within the expression', () => {
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
    test('after a field name', async () => {
      await whereExpectSuggestions('from a | where keywordField ', [
        // all functions compatible with a keywordField type
        ...getFunctionSignaturesByReturnType(
          Location.WHERE,
          'boolean',
          {
            operators: true,
          },
          undefined,
          ['and', 'or', 'not']
        ),
      ]);

      await whereExpectSuggestions('from a | where keywordField I', [
        // all functions compatible with a keywordField type
        ...getFunctionSignaturesByReturnType(
          Location.WHERE,
          'boolean',
          {
            operators: true,
          },
          undefined,
          ['and', 'or', 'not']
        ),
      ]);
    });

    test('suggests dates after a comparison with a date', async () => {
      const expectedFields = getFieldNamesByType(['date', 'date_nanos']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      const expectedComparisonWithDateSuggestions = [
        ...getDateLiterals().map((item) => item.text),
        ...getFieldNamesByType(['date']),
        ...getFieldNamesByType(['date_nanos']),
        ...getFunctionSignaturesByReturnType(Location.WHERE, ['date', 'date_nanos'], {
          scalar: true,
        }),
      ];
      await whereExpectSuggestions(
        'from a | where dateField == ',
        expectedComparisonWithDateSuggestions,
        mockCallbacks
      );

      await whereExpectSuggestions(
        'from a | where dateField < ',
        expectedComparisonWithDateSuggestions,
        mockCallbacks
      );

      await whereExpectSuggestions(
        'from a | where dateField >= ',
        expectedComparisonWithDateSuggestions,
        mockCallbacks
      );
    });

    test('after a comparison with a string field', async () => {
      const expectedFields = getFieldNamesByType(['text', 'keyword', 'ip', 'version']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      await whereExpectSuggestions(
        'from a | where textField >= ',
        EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS,
        mockCallbacks
      );
      await whereExpectSuggestions(
        'from a | where textField >= textFiel',
        EXPECTED_COMPARISON_WITH_TEXT_FIELD_SUGGESTIONS,
        mockCallbacks
      );
    });

    test('after a logical operator', async () => {
      for (const op of ['and', 'or']) {
        await whereExpectSuggestions(`from a | where keywordField >= keywordField ${op} `, [
          ...getFieldNamesByType('any'),
          ...getFunctionSignaturesByReturnType(Location.WHERE, 'any', { scalar: true }),
        ]);
        await whereExpectSuggestions(
          `from a | where keywordField >= keywordField ${op} doubleField `,
          [
            ...getFunctionSignaturesByReturnType(Location.WHERE, 'boolean', { operators: true }, [
              'double',
            ]),
          ]
        );
      }
    });
    test('after a logical operator numeric', async () => {
      const expectedFieldsNumeric = getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFieldsNumeric.map((name) => ({ label: name, text: name }))
      );
      for (const op of ['and', 'or']) {
        await whereExpectSuggestions(
          `from a | where keywordField >= keywordField ${op} doubleField == `,
          [
            ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
            ...getFunctionSignaturesByReturnType(Location.WHERE, ESQL_COMMON_NUMERIC_TYPES, {
              scalar: true,
            }),
          ],
          mockCallbacks
        );
      }
    });

    test('suggests operators after a field name', async () => {
      await whereExpectSuggestions('from a | stats a=avg(doubleField) | where doubleField ', [
        ...getFunctionSignaturesByReturnType(
          Location.WHERE,
          'any',
          { operators: true, skipAssign: true },
          ['double']
        ),
      ]);
    });

    test('suggests function arguments', async () => {
      const expectedFields = getFieldNamesByType(['double', 'integer', 'long', 'unsigned_long']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      // The editor automatically inject the final bracket, so it is not useful to test with just open bracket
      await whereExpectSuggestions(
        'from a | where log10(',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(
            Location.WHERE,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true },
            undefined,
            ['log10']
          ),
        ],
        mockCallbacks
      );
      await whereExpectSuggestions(
        'from a | WHERE pow(doubleField, ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(
            Location.WHERE,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true },
            undefined,
            ['pow']
          ),
        ],
        mockCallbacks
      );
    });

    test('suggests boolean and numeric operators after a numeric function result', async () => {
      await whereExpectSuggestions('from a | where log10(doubleField) ', [
        ...getFunctionSignaturesByReturnType(Location.WHERE, 'double', { operators: true }, [
          'double',
        ]),
        ...getFunctionSignaturesByReturnType(Location.WHERE, 'boolean', { operators: true }, [
          'double',
        ]),
      ]);
    });

    test('suggestions after IS', async () => {
      await whereExpectSuggestions('from index | WHERE keywordField IS ', [
        'IS NULL',
        'IS NOT NULL',
      ]);

      await whereExpectSuggestions('from index | WHERE keywordField IS NU', ['IS NULL']);
    });

    test('suggestions after NOT', async () => {
      await whereExpectSuggestions('from index | WHERE keywordField not ', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);
      await whereExpectSuggestions('from index | WHERE keywordField NOT ', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);
      await whereExpectSuggestions('FROM index | WHERE NOT ENDS_WITH(keywordField, "foo") ', [
        'AND $0',
        'OR $0',
        '| ',
      ]);
      await whereExpectSuggestions('from index | WHERE keywordField IS NOT ', ['IS NOT NULL']);
      await whereExpectSuggestions('from index | WHERE keywordField IS NOT      ', ['IS NOT NULL']);
    });

    test('suggestions after IN', async () => {
      await whereExpectSuggestions('from index | WHERE doubleField in ', ['( $0 )']);
      await whereExpectSuggestions('from index | WHERE doubleField not in ', ['( $0 )']);
      const expectedFields = getFieldNamesByType(['double']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      await whereExpectSuggestions(
        'from index | WHERE doubleField not in (',
        [
          ...getFieldNamesByType('double'),
          ...getFunctionSignaturesByReturnType(Location.WHERE, 'double', { scalar: true }),
        ],
        mockCallbacks
      );
      await whereExpectSuggestions(
        'from index | WHERE doubleField in ( textField, ',
        [
          ...getFieldNamesByType('double'),
          ...getFunctionSignaturesByReturnType(Location.WHERE, 'double', { scalar: true }),
        ],
        mockCallbacks
      );
    });

    test('suggestions after IS (NOT) NULL', async () => {
      await whereExpectSuggestions('FROM index | WHERE tags.keyword IS NULL ', ['AND $0', 'OR $0']);

      await whereExpectSuggestions('FROM index | WHERE tags.keyword IS NOT NULL ', [
        'AND $0',
        'OR $0',
      ]);
    });

    test('suggestions after an arithmetic expression', async () => {
      await whereExpectSuggestions('FROM index | WHERE doubleField + doubleField ', [
        ...getFunctionSignaturesByReturnType(
          Location.WHERE,
          'any',
          { operators: true, skipAssign: true },
          ['double'],
          [':']
        ),
      ]);
    });

    test('pipe suggestion after complete expression', async () => {
      expect(await suggest('from index | WHERE doubleField != doubleField ')).toContainEqual(
        expect.objectContaining({
          label: '|',
        })
      );
    });

    describe('attaches ranges', () => {
      test('omits ranges if there is no prefix', async () => {
        (await suggest('FROM index | WHERE ')).forEach((suggestion) => {
          expect(suggestion.rangeToReplace).toBeUndefined();
        });
      });

      test('uses indices of single prefix by default', async () => {
        (await suggest('FROM index | WHERE some.prefix')).forEach((suggestion) => {
          expect(suggestion.rangeToReplace).toEqual({
            start: 19,
            end: 30,
          });
        });
      });

      test('"IS (NOT) NULL" with a matching prefix', async () => {
        const suggestions = await suggest('FROM index | WHERE doubleField IS N');

        expect(suggestions.find((s) => s.text === 'IS NOT NULL')?.rangeToReplace).toEqual({
          start: 31,
          end: 35,
        });

        expect(suggestions.find((s) => s.text === 'IS NULL')?.rangeToReplace).toEqual({
          start: 31,
          end: 35,
        });
      });

      test('"IS (NOT) NULL" with a matching prefix with trailing space', async () => {
        const suggestions = await suggest('FROM index | WHERE doubleField IS ');

        expect(suggestions.find((s) => s.text === 'IS NOT NULL')?.rangeToReplace).toEqual({
          start: 31,
          end: 34,
        });

        expect(suggestions.find((s) => s.text === 'IS NULL')?.rangeToReplace).toEqual({
          start: 31,
          end: 34,
        });
      });
    });
  });
});
