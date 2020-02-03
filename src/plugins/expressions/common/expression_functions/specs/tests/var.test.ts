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
import { variable } from '../var';
import { ExecutionContext } from '../../../execution/types';
import { KibanaContext } from '../../../expression_types';

describe('expression_functions', () => {
  describe('var', () => {
    const fn = functionWrapper(variable);
    let input: Partial<KibanaContext>;
    let context: ExecutionContext;

    beforeEach(() => {
      input = { timeRange: { from: '0', to: '1' } };
      context = {
        getInitialInput: () => input,
        types: {},
        variables: { test: 1 },
        abortSignal: {} as any,
        inspectorAdapters: {} as any,
      };
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
