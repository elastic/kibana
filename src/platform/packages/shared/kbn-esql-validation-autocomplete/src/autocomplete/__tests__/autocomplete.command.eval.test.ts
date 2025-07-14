/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { timeUnitsToSuggest, ESQL_COMMON_NUMERIC_TYPES } from '@kbn/esql-ast';
import { Location } from '@kbn/esql-ast/src/commands_registry/types';
import {
  setup,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
  createCustomCallbackMocks,
  getLiteralsByType,
  AssertSuggestionsFn,
  fields,
} from './helpers';
import { roundParameterTypes } from './constants';

describe('autocomplete.suggest', () => {
  describe(Location.EVAL, () => {
    let assertSuggestions: AssertSuggestionsFn;

    beforeEach(async () => {
      const setupResult = await setup();
      assertSuggestions = setupResult.assertSuggestions;
    });

    test('empty expression', async () => {
      await assertSuggestions('from a | eval /', [
        'col0 = ',
        ...getFieldNamesByType('any').map((v) => `${v} `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ]);

      await assertSuggestions('from a | eval col0 = /', [
        ...getFieldNamesByType('any').map((v) => `${v} `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ]);

      await assertSuggestions('from a | eval col0 = 1, /', [
        'col1 = ',
        ...getFieldNamesByType('any').map((v) => `${v} `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ]);

      await assertSuggestions('from a | eval col0 = 1, col1 = /', [
        ...getFieldNamesByType('any').map((v) => `${v} `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ]);

      // Re-enable with https://github.com/elastic/kibana/issues/210639
      // await assertSuggestions('from a | eval a=doubleField, /', [
      //   'col0 = ',
      //   ...getFieldNamesByType('any').map((v) => `${v} `),
      //   'a',
      //   ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      // ]);

      await assertSuggestions(
        'from b | stats avg(doubleField) by keywordField | eval /',
        [
          'col0 = ',
          '`avg(doubleField)` ',
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        {
          triggerCharacter: ' ',
          // make aware EVAL of the previous STATS command
          callbacks: createCustomCallbackMocks(
            [{ name: 'avg(doubleField)', type: 'double' }],
            undefined,
            undefined
          ),
        }
      );
      await assertSuggestions(
        'from c | eval abs(doubleField) + 1 | eval /',
        [
          'col0 = ',
          ...getFieldNamesByType('any').map((v) => `${v} `),
          '`abs(doubleField) + 1` ',
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        {
          triggerCharacter: ' ',
          callbacks: createCustomCallbackMocks(
            [...fields, { name: 'abs(doubleField) + 1', type: 'double' }],
            undefined,
            undefined
          ),
        }
      );
      await assertSuggestions(
        'from d | stats avg(doubleField) by keywordField | eval /',
        [
          'col0 = ',
          '`avg(doubleField)` ',
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        {
          triggerCharacter: ' ',
          callbacks: createCustomCallbackMocks(
            [{ name: 'avg(doubleField)', type: 'double' }],
            undefined,
            undefined
          ),
        }
      );
    });

    test('after column', async () => {
      await assertSuggestions('from a | eval doubleField /', [
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          'any',
          { operators: true, skipAssign: true },
          ['double']
        ),
      ]);
    });

    test('after column after assignment', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('from a | eval col = doubleField /');
      expect(suggestions.map((s) => s.text)).toContain('| ');
    });

    test('after NOT', async () => {
      await assertSuggestions('from index | EVAL keywordField not /', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);

      await assertSuggestions('from index | EVAL keywordField NOT /', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);

      await assertSuggestions('from index | EVAL not /', [
        ...getFieldNamesByType('boolean').map((v) => `${v} `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'boolean', { scalar: true }),
      ]);
    });

    test('with lists', async () => {
      await assertSuggestions('from index | EVAL doubleField in /', ['( $0 )']);
      await assertSuggestions(
        'from index | EVAL doubleField in (/)',
        [
          ...getFieldNamesByType('double').filter((name) => name !== 'doubleField'),
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'double', { scalar: true }),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from index | EVAL doubleField not in /', ['( $0 )']);
    });

    test('after assignment', async () => {
      await assertSuggestions(
        'from a | eval a=/',
        [
          ...getFieldNamesByType('any').map((v) => `${v} `),
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        { triggerCharacter: '=' }
      );
      await assertSuggestions(
        'from a | eval a=abs(doubleField), b= /',
        [
          ...getFieldNamesByType('any').map((v) => `${v} `),
          ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
        ],
        { triggerCharacter: '=' }
      );
    });

    test('in and around functions', async () => {
      await assertSuggestions(
        'from a | eval a=round(/)',
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
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval a=raund(/)', // note the typo in round
        [],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval a=raund(/', // note the typo in round
        []
      );
      await assertSuggestions(
        'from a | eval raund(/', // note the typo in round
        []
      );
      await assertSuggestions(
        'from a | eval raund(5, /', // note the typo in round
        [],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval col0 = raund(5, /', // note the typo in round
        [],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from a | eval a=round(doubleField) /', [
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
      ]);
      await assertSuggestions(
        'from a | eval a=round(doubleField, /',
        [
          ...getFieldNamesByType(['integer', 'long']),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['integer', 'long'],
            { scalar: true },
            undefined,
            ['round']
          ),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval round(doubleField, /',
        [
          ...getFieldNamesByType(['integer', 'long']),
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            ['integer', 'long'],
            { scalar: true },
            undefined,
            ['round']
          ),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from a | eval a=round(doubleField),/', [
        'col0 = ',
        ...getFieldNamesByType('any').map((v) => `${v} `),
        // Re-enable with https://github.com/elastic/kibana/issues/210639
        // 'a',
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'any', { scalar: true }),
      ]);
      await assertSuggestions('from a | eval a=round(doubleField) + /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions('from a | eval a=round(doubleField)+ /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions('from a | eval a=doubleField+ /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions('from a | eval a=`any#Char$Field`+ /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType(Location.EVAL, ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);

      await assertSuggestions(
        'from a | eval a=round(doubleField), b=round(/)',
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
        { triggerCharacter: '(' }
      );
      // test that comma is correctly added to the suggestions if minParams is not reached yet
      await assertSuggestions('from a | eval a=concat( /', [
        ...getFieldNamesByType(['text', 'keyword']).map((v) => `${v}, `),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['concat']
        ).map((v) => ({ ...v, text: `${v.text},` })),
      ]);
      await assertSuggestions(
        'from a | eval a=concat(textField, /',
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
        { triggerCharacter: ' ' }
      );
      // test that the arg type is correct after minParams
      await assertSuggestions('from a | eval a=cidr_match(ipField, textField, /', [], {
        triggerCharacter: ' ',
      });
      // test that comma is correctly added to the suggestions if minParams is not reached yet
      await assertSuggestions('from a | eval a=cidr_match(/', [
        ...getFieldNamesByType('ip').map((v) => `${v}, `),
        ...getFunctionSignaturesByReturnType(Location.EVAL, 'ip', { scalar: true }, undefined, [
          'cidr_match',
        ]).map((v) => ({ ...v, text: `${v.text},` })),
      ]);
      await assertSuggestions(
        'from a | eval a=cidr_match(ipField, /',
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
        { triggerCharacter: ' ' }
      );
    });

    test('deep function nesting', async () => {
      for (const nesting of [1, 2, 3, 4]) {
        await assertSuggestions(
          `from a | eval a=${Array(nesting).fill('round(').join('').concat('/')}`,
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
          { triggerCharacter: '(' }
        );
      }
    });

    test('discards query after cursor', async () => {
      const absParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;

      // Smoke testing for suggestions in previous position than the end of the statement
      await assertSuggestions('from a | eval col0 = abs(doubleField) / | eval abs(col0)', [
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          'any',
          { operators: true, skipAssign: true },
          ['double']
        ),
        ', ',
        '| ',
      ]);
      await assertSuggestions('from a | eval col0 = abs(b/) | eval abs(col0)', [
        ...getFieldNamesByType(absParameterTypes),
        ...getFunctionSignaturesByReturnType(
          Location.EVAL,
          absParameterTypes,
          { scalar: true },
          undefined,
          ['abs']
        ),
      ]);
    });

    test('date math', async () => {
      const dateSuggestions = timeUnitsToSuggest.map(({ name }) => name);
      // Eval bucket is not a valid expression
      await assertSuggestions('from a | eval col0 = bucket(@timestamp, /', [], {
        triggerCharacter: ' ',
      });

      await assertSuggestions(
        'from a | eval a = 1 /',
        [
          ', ',
          '| ',
          ...getFunctionSignaturesByReturnType(
            Location.EVAL,
            'any',
            { operators: true, skipAssign: true },
            ['integer']
          ),
        ],
        { triggerCharacter: ' ' }
      );
      await assertSuggestions('from a | eval a = 1 year /', [', ', '| ', '+ $0', '- $0']);
      await assertSuggestions(
        'from a | eval col0=date_trunc(/)',
        [
          ...getLiteralsByType('time_duration').map((t) => `${t}, `),
          ...getFunctionSignaturesByReturnType(Location.EVAL, ['time_duration', 'date_period'], {
            scalar: true,
          }).map((t) => `${t.text},`),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval col0=date_trunc(2 /)',
        [...dateSuggestions.map((t) => `${t}, `), ','],
        { triggerCharacter: ' ' }
      );
    });
  });
});
