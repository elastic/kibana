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

        await assertSuggestions('from a | stats ?', expected);
        await assertSuggestions('FROM a | STATS ?', expected);
      });

      test('on assignment expression, shows all agg and eval functions', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=?', [...allAggFunctions, ...allEvaFunctions]);
      });

      test('on space after aggregate field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=max(b), ?', [
          'var0 =',
          ...allAggFunctions,
          ...allEvaFunctions,
        ]);
      });
    });

    describe('... BY <grouping>', () => {
      test('suggestions on <kbd>SPACE</kbd> after "BY" keyword', async () => {
        const { assertSuggestions } = await setup();
        const expected = [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ];

        await assertSuggestions('from a | stats a=max(b) by ?', expected);
        await assertSuggestions('from a | stats a=max(b) BY ?', expected);
      });

      test('suggestions on <kbd>SPACE</kbd> after grouping field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=c by d ?', [',', '|']);
      });

      test('suggestions on comma "," after grouping field', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | stats a=c by d, ?', [
          'var0 =',
          ...getFieldNamesByType('any'),
          ...allEvaFunctions,
          ...allGroupingFunctions,
        ]);
      });
    });
  });
});
