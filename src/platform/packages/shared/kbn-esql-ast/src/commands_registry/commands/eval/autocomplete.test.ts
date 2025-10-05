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
  DATE_DIFF_TIME_UNITS,
  mockFieldsWithTypes,
} from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';
import { ESQL_COMMON_NUMERIC_TYPES } from '../../../definitions/types';
import { timeUnitsToSuggest } from '../../../definitions/constants';
import { getDateLiterals } from '../../../definitions/utils';

const roundParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;

const evalExpectSuggestions = (
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
    'eval',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('EVAL Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = getMockCallbacks();
  });
  test('empty expression', async () => {
    await evalExpectSuggestions('from a | eval ', [
      ' = ',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    await evalExpectSuggestions('from a | eval col0 = /', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    await evalExpectSuggestions('from a | eval col0 = 1, ', [
      ' = ',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    await evalExpectSuggestions('from a | eval col0 = 1, col1 = /', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    // Re-enable with https://github.com/elastic/kibana/issues/210639
    // await evalExpectSuggestions('from a | eval a=doubleField, /', [
    //   'col0 = ',
    //   ...getFieldNamesByType('any'),
    //   'a',
    //   ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    // ]);

    await evalExpectSuggestions('from a | eval /', [
      ' = ',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    await evalExpectSuggestions('from a | eval col0 = /', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    await evalExpectSuggestions('from a | eval col0 = 1, ', [
      ' = ',
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    await evalExpectSuggestions('from a | eval col0 = 1, col1 = ', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);

    const expectedFields = getFieldNamesByType('any').map((name) => ({ label: name, text: name }));
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue([
      ...expectedFields,
      { label: 'avg(doubleField)', text: 'avg(doubleField)' },
    ]);

    await evalExpectSuggestions(
      'from b | stats avg(doubleField) by keywordField | eval ',
      [
        ' = ',
        'avg(doubleField)',
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ...getFieldNamesByType('any'),
      ],
      mockCallbacks
    );
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue([
      ...expectedFields,
      { label: 'abs(doubleField) + 1', text: 'abs(doubleField) + 1' },
    ]);

    await evalExpectSuggestions(
      'from c | eval abs(doubleField) + 1 | eval ',
      [
        ' = ',
        ...getFieldNamesByType('any'),
        'abs(doubleField) + 1',
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ],
      mockCallbacks
    );
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue([
      ...expectedFields,
      { label: 'avg(doubleField)', text: 'avg(doubleField)' },
    ]);
    await evalExpectSuggestions(
      'from d | stats avg(doubleField) by keywordField | eval ',
      [
        ' = ',
        'avg(doubleField)',
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ...getFieldNamesByType('any'),
      ],
      mockCallbacks
    );
  });

  it('after column', async () => {
    await evalExpectSuggestions('from a | eval doubleField ', [
      ...getFunctionSignaturesByReturnType(
        Location.EVAL,
        'any',
        { operators: true, skipAssign: true },
        ['double']
      ),
    ]);
  });

  test('after column after assignment', async () => {
    await evalExpectSuggestions('from a | eval col = doubleField ', [
      ', ',
      '| ',
      ...getFunctionSignaturesByReturnType(
        Location.EVAL,
        'any',
        { operators: true, skipAssign: true, agg: false, scalar: false },
        ['double']
      ),
    ]);
  });

  test('after NOT', async () => {
    const expectedFields = getFieldNamesByType('boolean');
    mockFieldsWithTypes(mockCallbacks, expectedFields);
    await evalExpectSuggestions(
      'from index | EVAL keywordField not ',
      ['LIKE $0', 'RLIKE $0', 'IN $0'],
      mockCallbacks
    );

    await evalExpectSuggestions(
      'from index | EVAL not ',
      [
        ...getFieldNamesByType('boolean'),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'boolean', { scalar: true }),
      ],
      mockCallbacks
    );
  });

  test('with lists', async () => {
    await evalExpectSuggestions('from index | EVAL doubleField in ', ['( $0 )']);
    await evalExpectSuggestions('from index | EVAL doubleField not in /', ['( $0 )']);
  });

  test('after assignment', async () => {
    await evalExpectSuggestions('from a | eval a=/', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);
    await evalExpectSuggestions('from a | eval a=abs(doubleField), b= /', [
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);
  });

  test('in and around functions', async () => {
    const expectedDoubleLongFields = getFieldNamesByType(['double', 'long']);
    mockFieldsWithTypes(mockCallbacks, expectedDoubleLongFields);
    await evalExpectSuggestions(
      'from a | eval a=round(doubleField) ',
      [
        ', ',
        '| ',
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          'any',
          { operators: true, skipAssign: true },
          ['double', 'long']
        ),
        'IN $0',
        'IS NOT NULL',
        'IS NULL',
        'NOT IN $0',
      ],
      mockCallbacks
    );

    await evalExpectSuggestions(
      'from a | eval a=raund( ', // note the typo in round
      [],
      mockCallbacks
    );
    await evalExpectSuggestions(
      'from a | eval raund(5, ', // note the typo in round
      [],
      mockCallbacks
    );
    await evalExpectSuggestions(
      'from a | eval col0 = raund(5, ', // note the typo in round
      [],
      mockCallbacks
    );
    const expectedDoubleIntegerFields = getFieldNamesByType(['integer', 'long']);
    mockFieldsWithTypes(mockCallbacks, expectedDoubleIntegerFields);
    await evalExpectSuggestions(
      'from a | eval a=round(doubleField, ',
      [
        ...expectedDoubleIntegerFields,
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['integer', 'long'],
          { scalar: true },
          undefined,
          ['round']
        ),
      ],
      mockCallbacks
    );
    await evalExpectSuggestions(
      'from a | eval round(doubleField, ',
      [
        ...expectedDoubleIntegerFields,
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['integer', 'long'],
          { scalar: true },
          undefined,
          ['round']
        ),
      ],
      mockCallbacks
    );
    const expectedAny = getFieldNamesByType('any');
    mockFieldsWithTypes(mockCallbacks, expectedAny);
    await evalExpectSuggestions(
      'from a | eval a=round(doubleField), ',
      [
        ' = ',
        ...expectedAny,
        // Re-enable with https://github.com/elastic/kibana/issues/210639
        // 'a',
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ],
      mockCallbacks
    );
    const expectedNumeric = getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES);
    mockFieldsWithTypes(mockCallbacks, expectedNumeric);
    await evalExpectSuggestions(
      'from a | eval a=round(doubleField) + ',
      [
        ...expectedNumeric,
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ],
      mockCallbacks
    );
    await evalExpectSuggestions(
      'from a | eval a=round(doubleField)+ ',
      [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ],
      mockCallbacks
    );
    await evalExpectSuggestions(
      'from a | eval a=doubleField+ ',
      [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ],
      mockCallbacks
    );
    const expectedStrings = getFieldNamesByType(['text', 'keyword']);
    mockFieldsWithTypes(mockCallbacks, expectedStrings);
    // test that comma is correctly added to the suggestions if minParams is not reached yet
    await evalExpectSuggestions(
      'from a | eval a=concat( ',
      [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['concat']
        ).map((v) => `${v},`),
      ],
      mockCallbacks
    );
    await evalExpectSuggestions(
      'from a | eval a=concat(textField, ',
      [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['concat']
        ),
      ],
      mockCallbacks
    );
    const expectedIps = getFieldNamesByType(['ip']);
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedIps.map((name) => ({ label: name, text: name }))
    );

    // test that comma is correctly added to the suggestions if minParams is not reached yet
    await evalExpectSuggestions(
      'from a | eval a=cidr_match( ',
      [
        ...getFieldNamesByType('ip'),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'ip', { scalar: true }, undefined, [
          'cidr_match',
        ]).map((v) => `${v},`),
      ],
      mockCallbacks
    );
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedStrings.map((name) => ({ label: name, text: name }))
    );
    await evalExpectSuggestions(
      'from a | eval a=cidr_match(ipField, ',
      [
        ...getFieldNamesByType(['text', 'keyword']),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['cidr_match']
        ),
      ],
      mockCallbacks
    );
  });

  test('after comma ', async () => {
    await evalExpectSuggestions('from a | eval a=round(doubleField), ', [
      ' = ',
      ...getFieldNamesByType('any'),
      // Re-enable with https://github.com/elastic/kibana/issues/210639
      // 'a',
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
    ]);
  });

  test('deep function nesting', async () => {
    const expectedFields = getFieldNamesByType(roundParameterTypes);
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
    for (const nesting of [1, 2, 3, 4]) {
      const query = `from a | eval a=${Array(nesting).fill('round(').join('').concat(' ')}`;
      const cursorPosition = query.length - 1; // position after the last opening parenthesis
      await evalExpectSuggestions(
        query,
        [
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            roundParameterTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ],
        mockCallbacks,
        mockContext,
        cursorPosition
      );
    }
  });

  test('discards query after cursor', async () => {
    // Smoke testing for suggestions in previous position than the end of the statement
    await evalExpectSuggestions('from a | eval col0 = abs(doubleField) / | eval abs(col0)', [
      ...getFunctionSignaturesByReturnType(
        Location.EVAL,
        'any',
        { operators: true, skipAssign: true },
        ['double']
      ),
      ', ',
      '| ',
    ]);

    const expectedFields = getFieldNamesByType(['double', 'integer', 'long', 'unsigned_long']);
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );

    await evalExpectSuggestions(
      'from a | eval col0 = abs(b ) | eval abs(col0) ',
      [
        ...getFieldNamesByType(['double', 'integer', 'long', 'unsigned_long']),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['double', 'integer', 'long', 'unsigned_long'],
          { scalar: true },
          undefined,
          ['abs']
        ),
      ],
      mockCallbacks,
      mockContext,
      27
    );
  });

  test('date math', async () => {
    const dateSuggestions = timeUnitsToSuggest.map(({ name }) => name);

    await evalExpectSuggestions('from a | eval a = 1 ', [
      ', ',
      '| ',
      ...getFunctionSignaturesByReturnType(
        Location.EVAL,
        'any',
        { operators: true, skipAssign: true },
        ['integer']
      ),
    ]);

    await evalExpectSuggestions('from a | eval a = 1 year ', [', ', '| ', '+ $0', '- $0']);

    await evalExpectSuggestions('from a | eval col0=date_trunc(2 ', [
      ...dateSuggestions.map((t) => `${t}, `),
      ',',
    ]);
  });

  describe('case', () => {
    const allSuggestions = [
      // With extra space after field name to open suggestions
      ...getFieldNamesByType('any'),
      ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }, undefined, [
        'case',
      ]),
    ];

    test('first position', async () => {
      await evalExpectSuggestions('from a | eval case(', allSuggestions);
      await evalExpectSuggestions('from a | eval case(', allSuggestions);
    });

    test('suggests operators after initial column based on type', async () => {
      // case( field ) suggests all appropriate operators for that field type
      await evalExpectSuggestions('from a | eval case( textField ', [
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          'any',
          { operators: true, skipAssign: true, agg: false, scalar: false },
          ['text']
        ),
        ',',
      ]);
      await evalExpectSuggestions('from a | eval case( doubleField ', [
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          'any',
          { operators: true, skipAssign: true, agg: false, scalar: false },
          ['double']
        ),
        ',',
      ]);
      await evalExpectSuggestions('from a | eval case( booleanField ', [
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          'any',
          { operators: true, skipAssign: true, agg: false, scalar: false },
          ['boolean']
        ),
        ',',
      ]);
    });

    test('after comparison operator', async () => {
      const expectedFields = getFieldNamesByType(['keyword', 'text']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      // case( field > /) suggest field/function of the same type of the right hand side to complete the boolean expression
      await evalExpectSuggestions(
        'from a | eval case( keywordField != ',
        [
          // Notice no extra space after field name
          ...getFieldNamesByType(['keyword', 'text']),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['keyword', 'text'],
            { scalar: true },
            undefined,
            []
          ),
        ],
        mockCallbacks
      );

      const expectedNumeric = getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedNumeric.map((name) => ({ label: name, text: name }))
      );

      const expectedNumericSuggestions = [
        // Notice no extra space after field name
        ...expectedNumeric,
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ESQL_COMMON_NUMERIC_TYPES,
          { scalar: true },
          undefined,
          []
        ),
      ];
      await evalExpectSuggestions(
        'from a | eval case( integerField != ',
        expectedNumericSuggestions,
        mockCallbacks
      );
      await evalExpectSuggestions(
        'from a | eval case( integerField != ',
        expectedNumericSuggestions,
        mockCallbacks
      );
    });

    test('after complete comparison suggests logical operators and comma', async () => {
      // case( field > field ) should suggest AND, OR, and comma
      await evalExpectSuggestions('from a | eval case( integerField < doubleField ', [
        'AND $0',
        'OR $0',
        ',',
      ]);

      await evalExpectSuggestions('from a | eval case( keywordField == textField ', [
        'AND $0',
        'OR $0',
        ',',
      ]);
    });

    test('suggestions for second position', async () => {
      // case( field > 0, >) suggests fields like normal
      await evalExpectSuggestions('from a | eval case( integerField != doubleField, ', [
        // With extra space after field name to open suggestions
        ...getFieldNamesByType('any'),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }, undefined, [
          'case',
        ]),
      ]);

      // case( multiple conditions ) suggests fields like normal
      await evalExpectSuggestions(
        'from a | eval case(integerField < 0, "negative", integerField > 0, "positive", ',
        [
          // With extra space after field name to open suggestions
          ...getFieldNamesByType('any'),
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }, undefined, [
            'case',
          ]),
        ]
      );
    });
  });

  describe('controls literals', () => {
    test('suggests "Create new control" when supportsControls is true', async () => {
      const controlsContext = {
        ...mockContext,
        supportsControls: true,
      };

      await evalExpectSuggestions(
        'from logs* | eval ',
        [
          '',
          ' = ',
          ...getFieldNamesByType('any'),
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        undefined,
        controlsContext
      );
    });
  });

  describe('function parameter constraints', () => {
    test('constantOnly constraint - DATE_DIFF should suggest only constants, not fields', async () => {
      await evalExpectSuggestions(
        'from a | eval result = DATE_DIFF(',
        DATE_DIFF_TIME_UNITS,
        mockCallbacks
      );
    });

    test('function parameter type filtering and parent function exclusion - ABS excludes itself', async () => {
      const expectedNumericFields = getFieldNamesByType([
        'double',
        'integer',
        'long',
        'unsigned_long',
      ]);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedNumericFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = ABS(',
        [
          ...expectedNumericFields,
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true },
            undefined,
            ['abs']
          ),
        ],
        mockCallbacks
      );
    });

    test('parent function exclusion - TRIM excludes itself', async () => {
      const expectedStringFields = getFieldNamesByType(['keyword', 'text']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedStringFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = TRIM(',
        [
          ...expectedStringFields,
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['keyword', 'text'],
            { scalar: true },
            undefined,
            ['trim']
          ),
        ],
        mockCallbacks
      );
    });

    test('DATE_DIFF suggested values - suggests time units like year, month, day, hour', async () => {
      const expectedUnits = DATE_DIFF_TIME_UNITS;

      expect(expectedUnits).toEqual(
        expect.arrayContaining(['"year", ', '"month", ', '"day", ', '"hour", ', '"minute", '])
      );

      await evalExpectSuggestions(
        'from a | eval result = DATE_DIFF(',
        expectedUnits,
        mockCallbacks
      );
    });

    test('keyword and text are interchangeable - COALESCE with text param suggests both keyword and text fields', async () => {
      const expectedFields = getFieldNamesByType(['keyword', 'text']);
      mockFieldsWithTypes(mockCallbacks, expectedFields);

      const expectedSuggestions = [
        ...expectedFields,
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['keyword', 'text'],
          { scalar: true },
          undefined,
          ['coalesce']
        ),
      ];

      await evalExpectSuggestions(
        'from a | eval result = COALESCE(textField, ',
        expectedSuggestions,
        mockCallbacks
      );

      expect(expectedFields).toEqual(expect.arrayContaining(['textField', 'keywordField']));
    });

    test('handle unknown types in function contexts', async () => {
      const expectedFields = getFieldNamesByType(['double', 'integer', 'long', 'unsigned_long']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = abs(b ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true },
            undefined,
            ['abs']
          ),
        ],
        mockCallbacks,
        mockContext,
        27 // Position after 'b' with space
      );
    });
  });

  describe('complex expressions in functions', () => {
    test('suggests operators after field in function', async () => {
      const expectedFields = getFieldNamesByType(['double']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = abs(doubleField ',
        [
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            'any',
            { operators: true, skipAssign: true },
            ['double']
          ),
        ],
        mockCallbacks
      );
    });

    test('suggests fields after operator in function', async () => {
      const expectedFields = getFieldNamesByType(['double']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = round(doubleField + ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, ['double', 'integer', 'long'], {
            scalar: true,
          }),
        ],
        mockCallbacks
      );
    });

    test('nested functions with expressions', async () => {
      const expectedFields = getFieldNamesByType(['double']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = round(abs(doubleField - ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, ['double', 'integer', 'long'], {
            scalar: true,
          }),
        ],
        mockCallbacks
      );
    });

    test('multiple nested function calls', async () => {
      const expectedFields = getFieldNamesByType(['double']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      await evalExpectSuggestions(
        'from a | eval result = ceil(floor(abs(',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true }
          ).filter((fn) => !fn.includes('ABS(') && !fn.includes('CEIL(') && !fn.includes('FLOOR(')),
        ],
        mockCallbacks
      );
    });

    test('function with multiple parameters and expressions', async () => {
      const expectedFields = getFieldNamesByType(['double']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = pow(doubleField + 2, ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true }
          ).filter((fn) => !fn.includes('POW(')),
        ],
        mockCallbacks
      );
    });

    test('conditional expressions in functions', async () => {
      const expectedFields = getFieldNamesByType('any');
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      await evalExpectSuggestions(
        'from a | eval result = case(booleanField, doubleField * 2, ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }).filter(
            (fn) => !fn.includes('CASE')
          ),
        ],
        mockCallbacks
      );
    });

    test('string concatenation in functions', async () => {
      const expectedFields = getFieldNamesByType(['text', 'keyword']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      const baseFunctions = getFunctionSignaturesByReturnType(Location.EVAL, 'any', {
        scalar: true,
      }).filter((fn) => !fn.includes('CONCAT('));

      await evalExpectSuggestions(
        'from a | eval result = concat(textField, " - ", ',
        [...expectedFields, ...baseFunctions, 'MV_CONCAT($0)'],
        mockCallbacks
      );
    });

    test('date arithmetic in functions', async () => {
      const expectedFields = getFieldNamesByType(['date']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );

      const baseFunctions = getFunctionSignaturesByReturnType(Location.EVAL, ['date'], {
        scalar: true,
      });
      const dateLiterals = getDateLiterals().map((item) => item.text);

      await evalExpectSuggestions(
        'from a | eval result = date_diff("day", dateField, ',
        [...dateLiterals, ...expectedFields, ...baseFunctions, 'TO_DATE_NANOS($0)'],
        mockCallbacks
      );
    });

    test('boolean expressions in functions', async () => {
      const expectedFields = getFieldNamesByType('any');
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      await evalExpectSuggestions(
        'from a | eval result = case(doubleField > 10 AND ',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        mockCallbacks
      );
    });

    test('comma handling in multi-parameter functions', async () => {
      const expectedFields = getFieldNamesByType(['integer']);
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedFields.map((name) => ({ label: name, text: name }))
      );
      await evalExpectSuggestions(
        'from a | eval result = round(doubleField',
        [
          ...expectedFields,
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['double', 'integer', 'long', 'unsigned_long'],
            { scalar: true }
          ).filter((fn) => !fn.includes('ROUND(')),
        ],
        mockCallbacks
      );
    });
  });
});
