/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The package entry is loaded first: its modules have to be evaluated in the package's order.
import '../../../..';
import { createCallbacks } from '../../../__tests__/scenarios';
import {
  FunctionDefinitionTypes,
  type FunctionDefinition,
} from '../../../commands/definitions/types';
import { setTestFunctions } from '../../../commands/definitions/utils/test_functions';
import { Location } from '../../../commands/registry/types';
import { FUNCTION_LAMBDAS } from '../../../esql_js_sim/definitions';
import { locate } from '../../../esql_js_sim/grammar';
import { suggest } from '../suggest';
import { getLambdaState } from './lambdas';

// No function Kibana knows takes a lambda yet, so the tests declare two: one that keeps the
// values its lambda accepts, and one whose lambda takes two parameters.
const scalar = (name: string, lambdaReturns: 'boolean' | 'long'): FunctionDefinition => ({
  name,
  type: FunctionDefinitionTypes.SCALAR,
  description: '',
  locationsAvailable: [Location.EVAL, Location.WHERE, Location.SORT],
  signatures: [
    {
      params: [
        { name: 'values', type: 'long' },
        { name: 'lambda', type: lambdaReturns },
      ],
      returnType: 'long',
    },
  ],
});

const callbacks = createCallbacks({
  columns: [
    { name: 'k', type: 'keyword', userDefined: false },
    { name: 'n', type: 'long', userDefined: false },
  ],
});

const textsAt = async (query: string): Promise<string[]> =>
  (await suggest(query, query.length, callbacks)).map(({ text }) => text);

const stateAt = (query: string) => getLambdaState(locate(query, query.length));

describe('lambdas', () => {
  beforeAll(() => {
    setTestFunctions([scalar('test_filter', 'boolean'), scalar('test_reduce', 'long')]);
    FUNCTION_LAMBDAS.test_filter = { argument: 1, parameters: 1, valuesOf: 0 };
    FUNCTION_LAMBDAS.test_reduce = { argument: 1, parameters: 2, valuesOf: 0 };
  });

  afterAll(() => {
    setTestFunctions([]);
    delete FUNCTION_LAMBDAS.test_filter;
    delete FUNCTION_LAMBDAS.test_reduce;
  });

  describe('where the cursor is in a lambda', () => {
    it('is at the parameters where the argument that takes the lambda starts', () => {
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(n, ')).toEqual({
        kind: 'parameters',
        count: 1,
      });
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(n, v')).toEqual({
        kind: 'parameters',
        count: 1,
      });
      expect(stateAt('FROM lam | EVAL a = TEST_REDUCE(n, ')).toEqual({
        kind: 'parameters',
        count: 2,
      });
    });

    it('is in no lambda in the other arguments, and in a function that takes none', () => {
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(')).toBeUndefined();
      expect(stateAt('FROM lam | EVAL a = ROUND(n, ')).toBeUndefined();
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(ROUND(n, ')).toBeUndefined();
    });

    it('is at the arrow after the name of the parameter', () => {
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(n, v ')).toEqual({ kind: 'arrow' });
    });

    it('is in the body after the arrow, with the parameters of the lambda', () => {
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(n, v -> ')).toMatchObject({
        kind: 'body',
        parameters: [{ name: 'v', valuesFrom: 32 }],
      });
      expect(stateAt('FROM lam | EVAL a = TEST_REDUCE(n, (v, w) -> v + ')).toMatchObject({
        kind: 'body',
        parameters: [
          { name: 'v', valuesFrom: 32 },
          { name: 'w', valuesFrom: 32 },
        ],
      });
    });

    it('has the parameters of every lambda around the cursor', () => {
      const query = 'FROM lam | EVAL a = TEST_FILTER(n, v -> TEST_FILTER(n, w -> ';

      expect(stateAt(query)).toMatchObject({
        kind: 'body',
        parameters: [{ name: 'v' }, { name: 'w' }],
      });
    });

    it('is in no lambda after one is closed', () => {
      expect(stateAt('FROM lam | EVAL a = TEST_FILTER(n, v -> v > 1) + ')).toBeUndefined();
    });
  });

  describe('suggestions', () => {
    it('offers the parameters with the arrow where a lambda starts, and nothing else', async () => {
      expect(await textsAt('FROM lam | EVAL a = TEST_FILTER(n, ')).toEqual(['x -> ']);
      expect(await textsAt('FROM lam | EVAL a = TEST_REDUCE(n, ')).toEqual(['(x, y) -> ']);
    });

    it('picks parameter names the query does not use', async () => {
      expect(await textsAt('FROM lam | EVAL x = 1 | EVAL a = TEST_FILTER(n, ')).toEqual(['y -> ']);
    });

    it('offers the arrow after the name of the parameter, and nothing else', async () => {
      expect(await textsAt('FROM lam | EVAL a = TEST_FILTER(n, v ')).toEqual(['-> ']);
    });

    it('offers in the body the parameters next to the columns and functions', async () => {
      // The lambda of this function gives a number, as its values are.
      const texts = await textsAt('FROM lam | EVAL a = TEST_REDUCE(n, (v, w) -> ');

      expect(texts).toEqual(expect.arrayContaining(['v', 'w', 'n', 'ABS($0)']));
      expect(texts).not.toContain('k');
    });

    it('gives a parameter the type of the argument whose values it stands for', async () => {
      // `v` is a number as `n` is: arithmetic can follow it, a string operator cannot.
      const texts = await textsAt('FROM lam | EVAL a = TEST_REDUCE(n, (v, w) -> v ');

      expect(texts).toContain('+ $0');
      expect(texts).not.toContain('LIKE $0');
    });

    it('reads the body as the value of the argument', async () => {
      // The lambda of this function gives a boolean: a comparison can follow a parameter.
      const afterParameter = await textsAt('FROM lam | EVAL a = TEST_FILTER(n, v -> v ');
      const afterOperator = await textsAt('FROM lam | EVAL a = TEST_FILTER(n, v -> n > ');

      expect(afterParameter).toContain('> $0');
      expect(afterOperator).toEqual(expect.arrayContaining(['v', 'n']));
      expect(afterOperator).not.toContain('k');
    });

    it('offers the parameters of the lambdas around a nested one', async () => {
      const texts = await textsAt(
        'FROM lam | EVAL a = TEST_REDUCE(n, (v, w) -> TEST_REDUCE(n, (p, q) -> '
      );

      expect(texts).toEqual(expect.arrayContaining(['v', 'w', 'p', 'q']));
    });

    it('offers a parameter only inside its lambda', async () => {
      const texts = await textsAt('FROM lam | EVAL a = TEST_FILTER(n, v -> v > 1) + ');

      expect(texts).toContain('n');
      expect(texts).not.toContain('v');
    });

    it('does not let the command go on inside a lambda', async () => {
      expect(await textsAt('FROM lam | EVAL a = TEST_FILTER(n, v -> v > 1 ')).not.toContain('| ');
    });

    it('offers no lambda where the function declares none', async () => {
      const texts = await textsAt('FROM lam | EVAL a = ROUND(n, ');

      expect(texts.some((text) => text.includes('->'))).toBe(false);
    });
  });
});
