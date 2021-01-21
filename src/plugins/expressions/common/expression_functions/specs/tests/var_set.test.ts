/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from './utils';
import { variableSet } from '../var_set';
import { ExecutionContext } from '../../../execution/types';

describe('expression_functions', () => {
  describe('var_set', () => {
    const fn = functionWrapper(variableSet);
    let input: Partial<ReturnType<ExecutionContext['getSearchContext']>>;
    let context: ExecutionContext;
    let variables: Record<string, any>;

    beforeEach(() => {
      input = { timeRange: { from: '0', to: '1' } };
      context = {
        getSearchContext: () => input,
        getSearchSessionId: () => undefined,
        types: {},
        variables: { test: 1 },
        abortSignal: {} as any,
        inspectorAdapters: {} as any,
      };

      variables = context.variables;
    });

    it('updates a variable', () => {
      const actual = fn(input, { name: 'test', value: 2 }, context);
      expect(variables.test).toEqual(2);
      expect(actual).toEqual(input);
    });

    it('sets a new variable', () => {
      const actual = fn(input, { name: 'new', value: 3 }, context);
      expect(variables.new).toEqual(3);
      expect(actual).toEqual(input);
    });

    it('stores context if value is not set', () => {
      const actual = fn(input, { name: 'test' }, context);
      expect(variables.test).toEqual(input);
      expect(actual).toEqual(input);
    });
  });
});
