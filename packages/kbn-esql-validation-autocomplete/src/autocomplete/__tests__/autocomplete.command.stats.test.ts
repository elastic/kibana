/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup, getFunctionSignaturesByReturnType, getFieldNamesByType } from './helpers';

const allAggFunctions = getFunctionSignaturesByReturnType('stats', 'any', {
  agg: true,
});

const allEvaFunctions = getFunctionSignaturesByReturnType(
  'stats',
  'any',
  {
    evalMath: true,
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

describe('autocomplete.suggest', () => {
  describe('STATS <aggregates> [ BY <grouping> ]', () => {
    describe('STATS ...', () => {});

    describe('... <aggregates> ...', () => {
      test('lists possible aggregations on space after command', async () => {
        const { assertSuggestions } = await setup();
        const expected = ['var0 =', ...allAggFunctions, ...allEvaFunctions];

        await assertSuggestions('from a | stats /', expected);
        await assertSuggestions('FROM a | STATS /', expected);
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=/', [...allAggFunctions, ...allEvaFunctions]);
      });

      test('on space after aggregate field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=min(b) /', ['BY $0', ',', '|']);
      });

      test('on space after aggregate field with comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=max(b), /', [
          'var0 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
      });

      test('on function left paren', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'from a | stats by bucket(/',
          [
            ...getFieldNamesByType(['number', 'date']),
            ...getFunctionSignaturesByReturnType('eval', ['date', 'number'], { evalMath: true }),
          ].map((field) => `${field},`)
        );

        await assertSuggestions('from a | stats round(/', [
          ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true, grouping: true }),
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
        await assertSuggestions('from a | stats round(round(/', [
          ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true }),
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
        await assertSuggestions('from a | stats avg(round(/', [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
        await assertSuggestions('from a | stats avg(/', [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
        ]);
        await assertSuggestions('from a | stats round(avg(/', [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
      });

      test('when typing inside function left paren', async () => {
        const { assertSuggestions } = await setup();
        const expected = [
          ...getFieldNamesByType(['number', 'date']),
          ...getFunctionSignaturesByReturnType('stats', ['number', 'date'], {
            evalMath: true,
          }),
        ];

        await assertSuggestions('from a | stats a=min(/)', expected);
        await assertSuggestions('from a | stats a=min(/b), b=max()', expected);
        await assertSuggestions('from a | stats a=min(b), b=max(/)', expected);
      });

      test('inside function argument list', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats avg(b/) by stringField', [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
        ]);
      });

      test('when typing right paren', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a = min(b)/ | sort b', ['BY $0', ',', '|']);
      });

      test('increments suggested variable name counter', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | eval var0=round(b), var1=round(c) | stats /', [
          'var2 =',
          ...allAggFunctions,
          'var0',
          'var1',
          ...allEvaFunctions,
        ]);
        await assertSuggestions('from a | stats var0=min(b),var1=c,/', [
          'var2 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
      });
    });

    describe('... BY <grouping>', () => {
      test('on space after "BY" keyword', async () => {
        const { assertSuggestions } = await setup();
        const expected = [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ];

        await assertSuggestions('from a | stats a=max(b) by /', expected);
        await assertSuggestions('from a | stats a=max(b) BY /', expected);
        await assertSuggestions('from a | stats a=min(b) by /', expected);
      });

      test('on space after grouping field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=c by d /', [',', '|']);
      });

      test('after comma "," in grouping fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=c by d, /', [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats a=min(b),/', [
          'var0 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
        await assertSuggestions('from a | stats avg(b) by c, /', [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
          ...allGroupingFunctions,
        ]);
      });

      test('on space before expression right hand side operand', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats avg(b) by numberField % /', [
          ...getFieldNamesByType('number'),
          '`avg(b)`',
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats avg(b) by var0 = /', [
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('from a | stats avg(b) by c, var0 = /', [
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
      });

      test('on space after expression right hand side operand', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats avg(b) by numberField % 2 /', [',', '|']);
      });
    });
  });
});
