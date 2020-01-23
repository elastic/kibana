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
import { FunctionHandlers } from '../../../common/types';
import { KibanaContext } from '../../../common/expression_types/kibana_context';

describe('interpreter/functions#var', () => {
  const fn = functionWrapper(variable);
  let context: Partial<KibanaContext>;
  let initialContext: KibanaContext;
  let handlers: FunctionHandlers;

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
  });

  it('returns the selected variable', () => {
    const actual = fn(context, { name: 'test' }, handlers);
    expect(actual).toEqual(1);
  });

  it('returns undefined if variable does not exist', () => {
    const actual = fn(context, { name: 'unknown' }, handlers);
    expect(actual).toEqual(undefined);
  });
});
