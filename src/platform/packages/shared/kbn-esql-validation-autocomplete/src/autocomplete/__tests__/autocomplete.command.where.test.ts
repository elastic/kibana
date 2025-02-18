/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_COMMON_NUMERIC_TYPES } from '../../shared/esql_types';
import { ESQLVariableType } from '../../shared/types';
import { pipeCompleteItem } from '../complete_items';
import { getDateLiterals } from '../factories';
import { log10ParameterTypes, powParameterTypes } from './constants';
import {
  attachTriggerCommand,
  fields,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  setup,
} from './helpers';

describe('WHERE <expression>', () => {
  const allEvalFns = getFunctionSignaturesByReturnType('where', 'any', {
    scalar: true,
  });
  test('beginning an expression', async () => {
    const { assertSuggestions } = await setup();

    await assertSuggestions('from a | where /', [
      ...getFieldNamesByType('any')
        .map((field) => `${field} `)
        .map(attachTriggerCommand),
      ...allEvalFns,
    ]);
    await assertSuggestions(
      'from a | eval var0 = 1 | where /',
      [
        ...getFieldNamesByType('any')
          .map((name) => `${name} `)
          .map(attachTriggerCommand),
        attachTriggerCommand('var0 '),
        ...allEvalFns.filter((fn) => fn.label !== 'QSTR'),
      ],
      {
        callbacks: {
          getColumnsFor: () => Promise.resolve([...fields, { name: 'var0', type: 'integer' }]),
        },
      }
    );
  });

  describe('within the expression', () => {
    test('after a field name', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('from a | where keywordField /', [
        // all functions compatible with a keywordField type
        ...getFunctionSignaturesByReturnType(
          'where',
          'boolean',
          {
            builtin: true,
          },
          undefined,
          ['and', 'or', 'not']
        ),
      ]);
    });

    test('suggests dates after a comparison with a date', async () => {
      const { assertSuggestions } = await setup();

      const expectedComparisonWithDateSuggestions = [
        ...getDateLiterals(),
        ...getFieldNamesByType(['date']),
        ...getFieldNamesByType(['date_nanos']),
        ...getFunctionSignaturesByReturnType('where', ['date', 'date_nanos'], { scalar: true }),
      ];
      await assertSuggestions(
        'from a | where dateField == /',
        expectedComparisonWithDateSuggestions
      );

      await assertSuggestions(
        'from a | where dateField < /',
        expectedComparisonWithDateSuggestions
      );

      await assertSuggestions(
        'from a | where dateField >= /',
        expectedComparisonWithDateSuggestions
      );
    });

    test('after a comparison with a string field', async () => {
      const { assertSuggestions } = await setup();

      const expectedComparisonWithTextFieldSuggestions = [
        ...getFieldNamesByType(['text', 'keyword', 'ip', 'version']),
        ...getFunctionSignaturesByReturnType('where', ['text', 'keyword', 'ip', 'version'], {
          scalar: true,
        }),
      ];

      await assertSuggestions(
        'from a | where textField >= /',
        expectedComparisonWithTextFieldSuggestions
      );
      await assertSuggestions(
        'from a | where textField >= textField/',
        expectedComparisonWithTextFieldSuggestions
      );
    });

    test('after a logical operator', async () => {
      const { assertSuggestions } = await setup();

      for (const op of ['and', 'or']) {
        await assertSuggestions(`from a | where keywordField >= keywordField ${op} /`, [
          ...getFieldNamesByType('any'),
          ...getFunctionSignaturesByReturnType('where', 'any', { scalar: true }),
        ]);
        await assertSuggestions(`from a | where keywordField >= keywordField ${op} doubleField /`, [
          ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['double']),
        ]);
        await assertSuggestions(
          `from a | where keywordField >= keywordField ${op} doubleField == /`,
          [
            ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
            ...getFunctionSignaturesByReturnType('where', ESQL_COMMON_NUMERIC_TYPES, {
              scalar: true,
            }),
          ]
        );
      }
    });

    test('filters suggestions based on previous commands', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('from a | where / | limit 3', [
        ...getFieldNamesByType('any')
          .map((field) => `${field} `)
          .map(attachTriggerCommand),
        ...allEvalFns,
      ]);

      await assertSuggestions('from a | limit 3 | where / ', [
        ...getFieldNamesByType('any')
          .map((field) => `${field} `)
          .map(attachTriggerCommand),
        ...allEvalFns.filter((fn) => fn.label !== 'QSTR' && fn.label !== 'MATCH'),
      ]);
    });

    test('suggests operators after a field name', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('from a | stats a=avg(doubleField) | where a /', [
        ...getFunctionSignaturesByReturnType('where', 'any', { builtin: true, skipAssign: true }, [
          'double',
        ]),
      ]);
    });

    test('accounts for fields lost in previous commands', async () => {
      const { assertSuggestions } = await setup();

      // Mind this test: suggestion is aware of previous commands when checking for fields
      // in this case the doubleField has been wiped by the STATS command and suggest cannot find it's type
      await assertSuggestions('from a | stats a=avg(doubleField) | where doubleField /', [], {
        callbacks: { getColumnsFor: () => Promise.resolve([{ name: 'a', type: 'double' }]) },
      });
    });

    test('suggests function arguments', async () => {
      const { assertSuggestions } = await setup();

      // The editor automatically inject the final bracket, so it is not useful to test with just open bracket
      await assertSuggestions(
        'from a | where log10(/)',
        [
          ...getFieldNamesByType(log10ParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'where',
            log10ParameterTypes,
            { scalar: true },
            undefined,
            ['log10']
          ),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | WHERE pow(doubleField, /)',
        [
          ...getFieldNamesByType(powParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'where',
            powParameterTypes,
            { scalar: true },
            undefined,
            ['pow']
          ),
        ],
        { triggerCharacter: ',' }
      );
    });

    test('suggests boolean and numeric operators after a numeric function result', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('from a | where log10(doubleField) /', [
        ...getFunctionSignaturesByReturnType('where', 'double', { builtin: true }, ['double']),
        ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['double']),
      ]);
    });

    test('suggestions after NOT', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from index | WHERE keywordField not /', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);
      await assertSuggestions('from index | WHERE keywordField NOT /', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);
      await assertSuggestions('from index | WHERE not /', [
        ...getFieldNamesByType('boolean').map((name) => attachTriggerCommand(`${name} `)),
        ...getFunctionSignaturesByReturnType('where', 'boolean', { scalar: true }, undefined, [
          ':',
        ]),
      ]);
      await assertSuggestions('FROM index | WHERE NOT ENDS_WITH(keywordField, "foo") /', [
        ...getFunctionSignaturesByReturnType(
          'where',
          'boolean',
          { builtin: true },
          ['boolean'],
          [':']
        ),
        pipeCompleteItem,
      ]);
      await assertSuggestions('from index | WHERE keywordField IS NOT/', [
        '!= $0',
        '== $0',
        'AND $0',
        'IN $0',
        'IS NOT NULL',
        'IS NULL',
        'NOT',
        'OR $0',
        '| ',
      ]);

      await assertSuggestions('from index | WHERE keywordField IS NOT /', [
        '!= $0',
        '== $0',
        'AND $0',
        'IN $0',
        'IS NOT NULL',
        'IS NULL',
        'NOT',
        'OR $0',
        '| ',
      ]);
    });

    test('suggestions after IN', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('from index | WHERE doubleField in /', ['( $0 )']);
      await assertSuggestions('from index | WHERE doubleField not in /', ['( $0 )']);
      await assertSuggestions(
        'from index | WHERE doubleField not in (/)',
        [
          ...getFieldNamesByType('double').filter((name) => name !== 'doubleField'),
          ...getFunctionSignaturesByReturnType('where', 'double', { scalar: true }),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from index | WHERE doubleField in ( `any#Char$Field`, /)', [
        ...getFieldNamesByType('double').filter(
          (name) => name !== '`any#Char$Field`' && name !== 'doubleField'
        ),
        ...getFunctionSignaturesByReturnType('where', 'double', { scalar: true }),
      ]);
      await assertSuggestions('from index | WHERE doubleField not in ( `any#Char$Field`, /)', [
        ...getFieldNamesByType('double').filter(
          (name) => name !== '`any#Char$Field`' && name !== 'doubleField'
        ),
        ...getFunctionSignaturesByReturnType('where', 'double', { scalar: true }),
      ]);
    });

    test('suggestions after IS (NOT) NULL', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('FROM index | WHERE tags.keyword IS NULL /', [
        'AND $0',
        'OR $0',
        '| ',
      ]);

      await assertSuggestions('FROM index | WHERE tags.keyword IS NOT NULL /', [
        'AND $0',
        'OR $0',
        '| ',
      ]);
    });

    test('suggestions after an arithmetic expression', async () => {
      const { assertSuggestions } = await setup();

      await assertSuggestions('FROM index | WHERE doubleField + doubleField /', [
        ...getFunctionSignaturesByReturnType(
          'where',
          'any',
          { builtin: true, skipAssign: true },
          ['double'],
          [':']
        ),
      ]);
    });

    test('pipe suggestion after complete expression', async () => {
      const { suggest } = await setup();
      expect(await suggest('from index | WHERE doubleField != doubleField /')).toContainEqual(
        expect.objectContaining({
          label: '|',
        })
      );
    });

    describe('attaches ranges', () => {
      test('omits ranges if there is no prefix', async () => {
        const { suggest } = await setup();

        (await suggest('FROM index | WHERE /')).forEach((suggestion) => {
          expect(suggestion.rangeToReplace).toBeUndefined();
        });
      });

      test('uses indices of single prefix by default', async () => {
        const { suggest } = await setup();

        (await suggest('FROM index | WHERE some.prefix/')).forEach((suggestion) => {
          expect(suggestion.rangeToReplace).toEqual({
            start: 20,
            end: 30,
          });
        });
      });

      test('"IS (NOT) NULL" with a matching prefix', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | WHERE doubleField IS N/');

        expect(suggestions.find((s) => s.text === 'IS NOT NULL')?.rangeToReplace).toEqual({
          start: 32,
          end: 36,
        });

        expect(suggestions.find((s) => s.text === 'IS NULL')?.rangeToReplace).toEqual({
          start: 32,
          end: 36,
        });
      });

      test('"IS (NOT) NULL" with a matching prefix with trailing space', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM index | WHERE doubleField IS /');

        expect(suggestions.find((s) => s.text === 'IS NOT NULL')?.rangeToReplace).toEqual({
          start: 32,
          end: 35,
        });

        expect(suggestions.find((s) => s.text === 'IS NULL')?.rangeToReplace).toEqual({
          start: 32,
          end: 35,
        });
      });
    });

    describe('create control suggestion', () => {
      test('suggests `Create control` option', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM a | WHERE agent.name == /', {
          callbacks: {
            canSuggestVariables: () => true,
            getVariablesByType: () => [],
            getColumnsFor: () => Promise.resolve([{ name: 'agent.name', type: 'keyword' }]),
          },
        });

        expect(suggestions).toContainEqual({
          label: 'Create control',
          text: '',
          kind: 'Issue',
          detail: 'Click to create',
          command: { id: 'esql.control.values.create', title: 'Click to create' },
          sortText: '11',
          rangeToReplace: { start: 31, end: 31 },
        });
      });

      test('suggests `?value` option', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('FROM a | WHERE agent.name == /', {
          callbacks: {
            canSuggestVariables: () => true,
            getVariablesByType: () => [
              {
                key: 'value',
                value: 'java',
                type: ESQLVariableType.VALUES,
              },
            ],
            getColumnsFor: () => Promise.resolve([{ name: 'agent.name', type: 'keyword' }]),
          },
        });

        expect(suggestions).toContainEqual({
          label: '?value',
          text: '?value',
          kind: 'Constant',
          detail: 'Named parameter',
          command: undefined,
          sortText: '11A',
          rangeToReplace: { start: 31, end: 31 },
        });
      });
    });
  });
});
