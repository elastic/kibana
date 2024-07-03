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
  describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
    describe('METRICS ...', () => {
      test('suggests command on first character', async () => {
        const { suggest } = await setup();

        const suggestions = await suggest('m/');
        const hasCommand = !!suggestions.find((s) => s.label === 'metrics');

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
      test.only('lists possible aggregations on space after index list', async () => {
        const { assertSuggestions } = await setup();
        const expected = ['var0 =', ...allAggFunctions, ...allEvaFunctions];

        await assertSuggestions('metrics a /', expected);
        // await assertSuggestions('METRICS a /', expected);
      });

      // test('on assignment expression, shows all agg and eval functions', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions('from a | stats a=/', [...allAggFunctions, ...allEvaFunctions]);
      // });

      // test('on space after aggregate field', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions('from a | stats a=min(b) /', ['by $0', ',', '|']);
      // });

      // test('on space after aggregate field with comma', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions('from a | stats a=max(b), /', [
      //     'var0 =',
      //     ...allAggFunctions,
      //     ...allEvaFunctions,
      //   ]);
      // });

      // test('on function left paren', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions(
      //     'from a | stats by bucket(/',
      //     [
      //       ...getFieldNamesByType(['number', 'date']),
      //       ...getFunctionSignaturesByReturnType('eval', ['date', 'number'], { evalMath: true }),
      //     ].map((field) => `${field},`)
      //   );

      //   await assertSuggestions('from a | stats round(/', [
      //     ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true, grouping: true }),
      //     ...getFieldNamesByType('number'),
      //     ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
      //       'round',
      //     ]),
      //   ]);
      //   await assertSuggestions('from a | stats round(round(/', [
      //     ...getFunctionSignaturesByReturnType('stats', 'number', { agg: true }),
      //     ...getFieldNamesByType('number'),
      //     ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
      //       'round',
      //     ]),
      //   ]);
      //   await assertSuggestions('from a | stats avg(round(/', [
      //     ...getFieldNamesByType('number'),
      //     ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
      //       'round',
      //     ]),
      //   ]);
      //   await assertSuggestions('from a | stats avg(/', [
      //     ...getFieldNamesByType('number'),
      //     ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
      //   ]);
      //   await assertSuggestions('from a | stats round(avg(/', [
      //     ...getFieldNamesByType('number'),
      //     ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }, undefined, [
      //       'round',
      //     ]),
      //   ]);
      // });

      // test('when typing inside function left paren', async () => {
      //   const { assertSuggestions } = await setup();
      //   const expected = [
      //     ...getFieldNamesByType(['number', 'date']),
      //     ...getFunctionSignaturesByReturnType('stats', ['number', 'date'], {
      //       evalMath: true,
      //     }),
      //   ];

      //   await assertSuggestions('from a | stats a=min(/)', expected);
      //   await assertSuggestions('from a | stats a=min(/b), b=max()', expected);
      //   await assertSuggestions('from a | stats a=min(b), b=max(/)', expected);
      // });

      // test('inside function argument list', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions('from a | stats avg(b/) by stringField', [
      //     ...getFieldNamesByType('number'),
      //     ...getFunctionSignaturesByReturnType('eval', 'number', { evalMath: true }),
      //   ]);
      // });

      // test('when typing right paren', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions('from a | stats a = min(b)/ | sort b', ['by $0', ',', '|']);
      // });

      // test('increments suggested variable name counter', async () => {
      //   const { assertSuggestions } = await setup();

      //   await assertSuggestions('from a | eval var0=round(b), var1=round(c) | stats /', [
      //     'var2 =',
      //     ...allAggFunctions,
      //     'var0',
      //     'var1',
      //     ...allEvaFunctions,
      //   ]);
      //   await assertSuggestions('from a | stats var0=min(b),var1=c,/', [
      //     'var2 =',
      //     ...allAggFunctions,
      //     ...allEvaFunctions,
      //   ]);
      // });
    });
  });
});
