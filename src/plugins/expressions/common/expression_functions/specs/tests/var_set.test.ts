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
import { FunctionHandlers } from '../../../common/types';
import { KibanaContext } from '../../../common/expression_types/kibana_context';

describe('interpreter/functions#varset', () => {
  const fn = functionWrapper(variableSet);
  let context: Partial<KibanaContext>;
  let initialContext: KibanaContext;
  let handlers: FunctionHandlers;
  let variables: Record<string, any>;

  beforeEach(() => {
    context = { timeRange: { from: '0', to: '1' } };
    initialContext = {
      type: 'kibana_context',
      query: { language: 'lucene', query: 'geo.src:US' },
      filters: [
        {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
          },
          query: { match: {} },
        },
      ],
      timeRange: { from: '2', to: '3' },
    };
    handlers = {
      getInitialContext: () => initialContext,
      variables: { test: 1 } as any,
    };

    variables = handlers.variables;
  });

  it('updates a variable', () => {
    const actual = fn(context, { name: 'test', value: 2 }, handlers);
    expect(variables.test).toEqual(2);
    expect(actual).toEqual(context);
  });

  it('sets a new variable', () => {
    const actual = fn(context, { name: 'new', value: 3 }, handlers);
    expect(variables.new).toEqual(3);
    expect(actual).toEqual(context);
  });

  it('stores context if value is not set', () => {
    const actual = fn(context, { name: 'test' }, handlers);
    expect(variables.test).toEqual(context);
    expect(actual).toEqual(context);
  });
});
