/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { variableSet } from '../var_set';
import { ExecutionContext } from '../../../execution/types';
import { createUnitTestExecutor } from '../../../test_helpers';
import { firstValueFrom } from 'rxjs';

describe('expression_functions', () => {
  describe('var_set', () => {
    const fn = functionWrapper(variableSet);
    let input: Partial<ReturnType<ExecutionContext['getSearchContext']>>;
    let context: ExecutionContext;
    let variables: Record<string, unknown>;

    beforeEach(() => {
      input = { timeRange: { from: '0', to: '1' } };
      context = {
        getSearchContext: () => input,
        getSearchSessionId: () => undefined,
        getExecutionContext: () => undefined,
        types: {},
        variables: { test: 1 },
        abortSignal: {},
        inspectorAdapters: {},
      } as unknown as typeof context;

      variables = context.variables;
    });

    it('updates a variable', () => {
      const actual = fn(input, { name: ['test'], value: [2] }, context);
      expect(variables.test).toEqual(2);
      expect(actual).toEqual(input);
    });

    it('sets a new variable', () => {
      const actual = fn(input, { name: ['new'], value: [3] }, context);
      expect(variables.new).toEqual(3);
      expect(actual).toEqual(input);
    });

    it('stores context if value is not set', () => {
      const actual = fn(input, { name: ['test'], value: [] }, context);
      expect(variables.test).toEqual(input);
      expect(actual).toEqual(input);
    });

    it('sets multiple variables', () => {
      const actual = fn(input, { name: ['new1', 'new2', 'new3'], value: [1, , 3] }, context);
      expect(variables.new1).toEqual(1);
      expect(variables.new2).toEqual(input);
      expect(variables.new3).toEqual(3);
      expect(actual).toEqual(input);
    });

    describe('running function thru executor', () => {
      const executor = createUnitTestExecutor();
      executor.registerFunction(variableSet);

      it('sets the variables', async () => {
        const vars = {};
        const { result } = await firstValueFrom(
          executor.run('var_set name=test1 name=test2 value=1', 2, { variables: vars })
        );

        expect(result).toEqual(2);

        expect(vars).toEqual({
          test1: 1,
          test2: 2,
        });
      });
    });
  });
});
