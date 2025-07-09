/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQL_COMMON_NUMERIC_TYPES } from '@kbn/esql-ast';
import { Location } from '@kbn/esql-ast/src/commands_registry/types';
import {
  AssertSuggestionsFn,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  setup,
} from './helpers';

describe('case', () => {
  let assertSuggestions: AssertSuggestionsFn;

  beforeEach(async () => {
    const setupResult = await setup();
    assertSuggestions = setupResult.assertSuggestions;
  });

  const comparisonOperators = ['==', '!=', '>', '<', '>=', '<='].map((op) => `${op}`).concat(',');

  // case( / ) suggest any field/eval function in this position as first argument

  const allSuggestions = [
    // With extra space after field name to open suggestions
    ...getFieldNamesByType('any').map((field) => `${field} `),
    ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }, undefined, [
      'case',
    ]),
  ];

  test('first position', async () => {
    await assertSuggestions('from a | eval case(/)', allSuggestions, {
      triggerCharacter: ' ',
    });
    await assertSuggestions('from a | eval case(/)', allSuggestions);
  });

  test('suggests comparison operators after initial column', async () => {
    // case( field /) suggest comparison operators at this point to converge to a boolean
    await assertSuggestions('from a | eval case( textField /)', comparisonOperators, {
      triggerCharacter: ' ',
    });
    await assertSuggestions('from a | eval case( doubleField /)', comparisonOperators, {
      triggerCharacter: ' ',
    });
    await assertSuggestions('from a | eval case( booleanField /)', comparisonOperators, {
      triggerCharacter: ' ',
    });
  });

  test('after comparison operator', async () => {
    // case( field > /) suggest field/function of the same type of the right hand side to complete the boolean expression
    await assertSuggestions(
      'from a | eval case( keywordField != /)',
      [
        // Notice no extra space after field name
        ...getFieldNamesByType(['keyword', 'text']).map((field) => `${field}`),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['keyword', 'text'],
          { scalar: true },
          undefined,
          []
        ),
      ],
      {
        triggerCharacter: ' ',
      }
    );

    const expectedNumericSuggestions = [
      // Notice no extra space after field name
      ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES).map((field) => `${field}`),
      ...getFunctionSignaturesByReturnType(
        Location.EVAL,
        ESQL_COMMON_NUMERIC_TYPES,
        { scalar: true },
        undefined,
        []
      ),
    ];
    await assertSuggestions('from a | eval case( integerField != /)', expectedNumericSuggestions, {
      triggerCharacter: ' ',
    });
    await assertSuggestions('from a | eval case( integerField != /)', expectedNumericSuggestions);
  });

  test('suggestions for second position', async () => {
    // case( field > 0, >) suggests fields like normal
    await assertSuggestions(
      'from a | eval case( integerField != doubleField, /)',
      [
        // With extra space after field name to open suggestions
        ...getFieldNamesByType('any').map((field) => `${field}`),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }, undefined, [
          'case',
        ]),
      ],
      {
        triggerCharacter: ' ',
      }
    );

    // case( multiple conditions ) suggests fields like normal
    await assertSuggestions(
      'from a | eval case(integerField < 0, "negative", integerField > 0, "positive", /)',
      [
        // With extra space after field name to open suggestions
        ...getFieldNamesByType('any').map((field) => `${field} `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }, undefined, [
          'case',
        ]),
      ],
      {
        triggerCharacter: ' ',
      }
    );
  });
});
