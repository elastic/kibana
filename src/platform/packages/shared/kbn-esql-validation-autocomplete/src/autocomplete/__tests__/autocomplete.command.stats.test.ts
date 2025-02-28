/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldType, FunctionReturnType } from '../../definitions/types';
import { ESQL_COMMON_NUMERIC_TYPES, ESQL_NUMBER_TYPES } from '../../shared/esql_types';
import { ESQLVariableType } from '../../shared/types';
import { getDateHistogramCompletionItem } from '../commands/stats/util';
import { allStarConstant } from '../complete_items';
import { roundParameterTypes } from './constants';
import {
  setup,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
  getLiteralsByType,
} from './helpers';

const allAggFunctions = getFunctionSignaturesByReturnType('stats', 'any', {
  agg: true,
});

const allEvaFunctions = getFunctionSignaturesByReturnType(
  'stats',
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
  'stats',
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
    describe('STATS ...', () => {});

    describe('... <aggregates> ...', () => {
      test('lists possible aggregations on space after command', async () => {
        const { assertSuggestions } = await setup();
        const expected = [
          'var0 = ',
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvaFunctions,
        ];

        await assertSuggestions('from a | stats /', expected);
        await assertSuggestions('FROM a | STATS /', expected);
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=/', [
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvaFunctions,
        ]);
      });

      test('on space after aggregate field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=min(b) /', ['BY ', ', ', '| ']);
      });

      test('on space after aggregate field with comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=max(b), /', [
          'var0 = ',
          ...allAggFunctions,
          ...allGroupingFunctions,
          ...allEvaFunctions,
        ]);
      });

      test('on function left paren', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats by bucket(/', [
          ...getFieldNamesByType([...ESQL_COMMON_NUMERIC_TYPES, 'date']).map(
            (field) => `${field}, `
          ),
          ...getFunctionSignaturesByReturnType('eval', ['date', ...ESQL_COMMON_NUMERIC_TYPES], {
            scalar: true,
          }).map((s) => ({ ...s, text: `${s.text},` })),
        ]);
        await assertSuggestions('from a | stats round(/', [
          ...getFunctionSignaturesByReturnType('stats', roundParameterTypes, {
            agg: true,
          }),
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'eval',
            roundParameterTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
        await assertSuggestions('from a | stats round(round(/', [
          ...getFunctionSignaturesByReturnType('stats', roundParameterTypes, { agg: true }),
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'eval',
            ESQL_NUMBER_TYPES,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
        await assertSuggestions('from a | stats avg(round(/', [
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'eval',
            ESQL_NUMBER_TYPES,
            { scalar: true },
            undefined,
            ['round']
          ),
        ]);
        await assertSuggestions('from a | stats avg(/', [
          ...getFieldNamesByType(avgTypes),
          ...getFunctionSignaturesByReturnType('eval', avgTypes, {
            scalar: true,
          }),
        ]);
        await assertSuggestions('from a | stats round(avg(/', [
          ...getFieldNamesByType(avgTypes),
          ...getFunctionSignaturesByReturnType('eval', avgTypes, { scalar: true }, undefined, [
            'round',
          ]),
        ]);
      });

      test('when typing inside function left paren', async () => {
        const { assertSuggestions } = await setup();
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
            'stats',
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
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats avg(b/) by stringField', [
          ...getFieldNamesByType(avgTypes),
          ...getFunctionSignaturesByReturnType('eval', avgTypes, {
            scalar: true,
          }),
        ]);
      });

      test('when typing right paren', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a = min(b)/ | sort b', ['BY ', ', ', '| ']);
      });

      test('increments suggested variable name counter', async () => {
        const { assertSuggestions } = await setup();

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
    });

    describe('... BY <grouping>', () => {
      test('on space after "BY" keyword', async () => {
        const { assertSuggestions } = await setup();
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
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=c by d /', [', ', '| ']);
      });

      test('after comma "," in grouping fields', async () => {
        const { assertSuggestions } = await setup();

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
          ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
          ...allGroupingFunctions,
        ]);
      });

      test('on space before expression right hand side operand', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats avg(b) by integerField % /', [
          ...getFieldNamesByType('integer'),
          ...getFieldNamesByType('double'),
          ...getFieldNamesByType('long'),
          ...getFunctionSignaturesByReturnType('eval', ['integer', 'double', 'long'], {
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
        const { assertSuggestions } = await setup();

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
        const { assertSuggestions } = await setup();
        await assertSuggestions('from a | stats avg(b) by BUCKET(/, 50, ?_tstart, ?_tend)', [
          // Note there's no space or comma in the suggested field names
          ...getFieldNamesByType(['date', ...ESQL_COMMON_NUMERIC_TYPES]),
          ...getFunctionSignaturesByReturnType('eval', ['date', ...ESQL_COMMON_NUMERIC_TYPES], {
            scalar: true,
          }),
        ]);
        await assertSuggestions('from a | stats avg(b) by BUCKET(  /  , 50, ?_tstart, ?_tend)', [
          // Note there's no space or comma in the suggested field names
          ...getFieldNamesByType(['date', ...ESQL_COMMON_NUMERIC_TYPES]),
          ...getFunctionSignaturesByReturnType('eval', ['date', ...ESQL_COMMON_NUMERIC_TYPES], {
            scalar: true,
          }),
        ]);

        await assertSuggestions(
          'from a | stats avg(b) by BUCKET(dateField, /50, ?_tstart, ?_tend)',
          [
            ...getLiteralsByType('time_literal'),
            ...getFunctionSignaturesByReturnType('eval', ['integer', 'date_period'], {
              scalar: true,
            }),
          ]
        );
      });

      test('count(/) to suggest * for all', async () => {
        const { suggest } = await setup();
        const suggestions = await suggest('from a | stats count(/)');
        expect(suggestions).toContain(allStarConstant);
      });

      describe('date histogram snippet', () => {
        test('uses histogramBarTarget preference when available', async () => {
          const { suggest } = await setup();
          const histogramBarTarget = Math.random() * 100;
          const expectedCompletionItem = getDateHistogramCompletionItem(histogramBarTarget);

          const suggestions = await suggest('FROM a | STATS BY /', {
            callbacks: { getPreferences: () => Promise.resolve({ histogramBarTarget }) },
          });

          expect(suggestions).toContainEqual(expectedCompletionItem);
        });

        test('defaults gracefully', async () => {
          const { suggest } = await setup();
          const expectedCompletionItem = getDateHistogramCompletionItem();

          const suggestions = await suggest('FROM a | STATS BY /');

          expect(suggestions).toContainEqual(expectedCompletionItem);
        });
      });

      describe('create control suggestion', () => {
        test('suggests `Create control` option for aggregations', async () => {
          const { suggest } = await setup();

          const suggestions = await suggest('FROM a | STATS /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariablesByType: () => [],
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

        test('suggests `?function` option', async () => {
          const { suggest } = await setup();

          const suggestions = await suggest('FROM a | STATS var0 = /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariablesByType: () => [
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
            label: '?function',
            text: '?function',
            kind: 'Constant',
            detail: 'Named parameter',
            command: undefined,
            sortText: '1A',
          });
        });

        test('suggests `Create control` option for grouping', async () => {
          const { suggest } = await setup();

          const suggestions = await suggest('FROM a | STATS BY /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariablesByType: () => [],
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

        test('suggests `?field` option', async () => {
          const { suggest } = await setup();

          const suggestions = await suggest('FROM a | STATS BY /', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariablesByType: () => [
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
            label: '?field',
            text: '?field',
            kind: 'Constant',
            detail: 'Named parameter',
            command: undefined,
            sortText: '11A',
          });
        });

        test('suggests `?interval` option', async () => {
          const { suggest } = await setup();

          const suggestions = await suggest('FROM a | STATS BY BUCKET(@timestamp, /)', {
            callbacks: {
              canSuggestVariables: () => true,
              getVariablesByType: () => [
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
      });
    });
  });
});
