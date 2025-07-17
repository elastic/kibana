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
import { ICommandCallbacks } from '../../types';
import { ESQL_COMMON_NUMERIC_TYPES } from '../../../definitions/types';
import { timeUnitsToSuggest } from '../../../definitions/constants';

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
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
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
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedDoubleLongFields.map((name) => ({ label: name, text: name }))
    );
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
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedDoubleIntegerFields.map((name) => ({ label: name, text: name }))
    );
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
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedAny.map((name) => ({ label: name, text: name }))
    );
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
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedNumeric.map((name) => ({ label: name, text: name }))
    );
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
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedStrings.map((name) => ({ label: name, text: name }))
    );
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

    const comparisonOperators = ['==', '!=', '>', '<', '>=', '<='];

    test('first position', async () => {
      await evalExpectSuggestions('from a | eval case(', allSuggestions);
      await evalExpectSuggestions('from a | eval case(', allSuggestions);
    });

    test('suggests comparison operators after initial column', async () => {
      // case( field /) suggest comparison operators at this point to converge to a boolean
      await evalExpectSuggestions('from a | eval case( textField ', [...comparisonOperators, ',']);
      await evalExpectSuggestions('from a | eval case( doubleField ', [
        ...comparisonOperators,
        ',',
      ]);
      await evalExpectSuggestions('from a | eval case( booleanField ', [
        ...comparisonOperators,
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
});
