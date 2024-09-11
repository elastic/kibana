/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { variable } from '../var';
import { ExecutionContext } from '../../../execution/types';

describe('expression_functions', () => {
  describe('var', () => {
    const fn = functionWrapper(variable);
    let input: Partial<ReturnType<ExecutionContext['getSearchContext']>>;
    let context: ExecutionContext;

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
    });

    it('returns the selected variable', () => {
      const actual = fn(input, { name: 'test' }, context);
      expect(actual).toEqual(1);
    });

    it('returns undefined if variable does not exist', () => {
      const actual = fn(input, { name: 'unknown' }, context);
      expect(actual).toEqual(undefined);
    });
  });
});
