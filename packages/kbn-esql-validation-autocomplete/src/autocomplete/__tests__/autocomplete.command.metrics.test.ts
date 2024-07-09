/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  setup,
  indexes,
  integrations,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
} from './helpers';

const visibleIndices = indexes
  .filter(({ hidden }) => !hidden)
  .map(({ name }) => name)
  .sort();

const allAggFunctions = getFunctionSignaturesByReturnType('metrics', 'any', {
  agg: true,
});

const allEvaFunctions = getFunctionSignaturesByReturnType(
  'metrics',
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
  'metrics',
  'any',
  {
    grouping: true,
  },
  undefined,
  undefined,
  'by'
);

describe('autocomplete.suggest', () => {
  describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
    describe('METRICS ...', () => {
      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('m/');
        const hasCommand = !!suggestions.find((s) => s.label.toUpperCase() === 'METRICS');

        expect(hasCommand).toBe(true);
      });
    });

    describe('... <sources> ...', () => {
      test('suggests visible indices on space', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('metrics /', visibleIndices);
        await assertSuggestions('METRICS /', visibleIndices);
        await assertSuggestions('metrics /index', visibleIndices);
      });

      test('suggests visible indices on comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a,/', visibleIndices);
        await assertSuggestions('METRICS a, /', visibleIndices);
        await assertSuggestions('metrics *,/', visibleIndices);
      });

      test('can suggest integration data sources', async () => {
        const dataSources = [...indexes, ...integrations];
        const visibleDataSources = dataSources
          .filter(({ hidden }) => !hidden)
          .map(({ name }) => name)
          .sort();
        const { assertSuggestions, callbacks } = await setup();
        const cb = {
          ...callbacks,
          getSources: jest.fn().mockResolvedValue(dataSources),
        };

        assertSuggestions('metrics /', visibleDataSources, { callbacks: cb });
        assertSuggestions('METRICS /', visibleDataSources, { callbacks: cb });
        assertSuggestions('METRICS a,/', visibleDataSources, { callbacks: cb });
        assertSuggestions('metrics a, /', visibleDataSources, { callbacks: cb });
        assertSuggestions('metrics *,/', visibleDataSources, { callbacks: cb });
      });
    });

    describe('... <aggregates> ...', () => {
      test('lists possible aggregations on space after index list', async () => {
        const { assertSuggestions } = await setup();
        const expected = ['var0 =', ...allAggFunctions, ...allEvaFunctions];

        await assertSuggestions('metrics a /', expected);
        await assertSuggestions('METRICS a /', expected);
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('metrics a a=/', [...allAggFunctions, ...allEvaFunctions]);
      });

      test('on space after aggregate field with comma', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a a=max(b), /', [
          'var0 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
      });

      test('on function left paren', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a round(/', [
          ...getFunctionSignaturesByReturnType('metrics', 'number', { agg: true, grouping: true }),
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
        await assertSuggestions('METRICS a round(round(/', [
          ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true }),
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
        await assertSuggestions('METRICS a avg(round(/', [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
            'round',
          ]),
        ]);
        await assertSuggestions('METRICS a avg(/', [
          ...getFieldNamesByType('number'),
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
        ]);
        await assertSuggestions('METRICS a round(avg(/', [
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
          ...getFunctionSignaturesByReturnType(
            'metrics',
            ['number', 'date'],
            {
              evalMath: true,
            },
            undefined,
            ['min']
          ),
        ];

        await assertSuggestions('METRICS a a=min(/)', expected);
        await assertSuggestions('METRICS a a=min(/b), b=max()', expected);
        await assertSuggestions(
          'METRICS a a=min(b), b=max(/)',
          expected.filter((s) => s !== 'MAX($0)')
        );
      });

      test('inside function argument list', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions(
          'METRICS a avg(b/) by stringField',
          [
            ...getFieldNamesByType('number'),
            ...getFunctionSignaturesByReturnType('metrics', 'number', {
              evalMath: true,
            }),
          ].filter((s) => s !== 'AVG($0)')
        );
      });

      test('when typing right paren', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a a = min(b)/ | sort b', ['BY $0', ',', '|']);
      });

      test('increments suggested variable name counter', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a var0=min(b),var1=c,/', [
          'var2 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
      });
    });

    describe('... BY <grouping>', () => {
      test('on space after aggregate fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a a=min(b) /', ['BY $0', ',', '|']);
      });

      test.only('on space after "BY" keyword', async () => {
        const { assertSuggestions } = await setup();
        const expected = [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ];

        await assertSuggestions('METRICS a a=max(b) by /', expected);
        // await assertSuggestions('METRICS a a=max(b) BY /', expected);
        // await assertSuggestions('METRICS a a=min(b) by /', expected);
      });

      test('on space after grouping field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a a=c by d /', [',', '|']);
      });

      test.skip('after comma "," in grouping fields', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a a=c by d, /', [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('METRICS a a=min(b),/', [
          'var0 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
        await assertSuggestions('METRICS a avg(b) by c, /', [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
          ...allGroupingFunctions,
        ]);
      });

      test.skip('on space before expression right hand side operand', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a avg(b) by numberField % /', [
          ...getFieldNamesByType('number'),
          '`avg(b)`',
          ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('METRICS a avg(b) by var0 = /', [
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
        await assertSuggestions('METRICS a avg(b) by c, var0 = /', [
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
      });

      test('on space after expression right hand side operand', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('METRICS a avg(b) by numberField % 2 /', [',', '|']);
      });
    });
  });
});
