/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { functionWrapper } from './utils';
import { variableSet } from '../var_set';
import { ExecutionContext } from '../../../execution/types';
import { KibanaContext } from '../../../expression_types';

describe('expression_functions', () => {
  describe('var_set', () => {
    const fn = functionWrapper(variableSet);
    let input: Partial<KibanaContext>;
    let context: ExecutionContext;
    let variables: Record<string, any>;

    beforeEach(() => {
      input = { timeRange: { from: '0', to: '1' } };
      context = {
        getInitialInput: () => input,
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
