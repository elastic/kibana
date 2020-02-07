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
import { kibana } from '../kibana';
import { FunctionHandlers } from '../../../common/types';
import { KibanaContext } from '../../../common/expression_types/kibana_context';

describe('interpreter/functions#kibana', () => {
  const fn = functionWrapper(kibana);
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
    };
  });

  it('returns an object with the correct structure', () => {
    const actual = fn(context, {}, handlers);
    expect(actual).toMatchSnapshot();
  });

  it('uses timeRange from context if not provided in initialContext', () => {
    initialContext.timeRange = undefined;
    const actual = fn(context, {}, handlers);
    expect(actual.timeRange).toEqual({ from: '0', to: '1' });
  });

  it.skip('combines query from context with initialContext', () => {
    context.query = { language: 'kuery', query: 'geo.dest:CN' };
    // TODO: currently this fails & likely requires a fix in run_pipeline
    const actual = fn(context, {}, handlers);
    expect(actual.query).toEqual('TBD');
  });

  it('combines filters from context with initialContext', () => {
    context.filters = [
      {
        meta: {
          disabled: true,
          negate: false,
          alias: null,
        },
        query: { match: {} },
      },
    ];
    const actual = fn(context, {}, handlers);
    expect(actual.filters).toEqual([
      {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
        query: { match: {} },
      },
      {
        meta: {
          disabled: true,
          negate: false,
          alias: null,
        },
        query: { match: {} },
      },
    ]);
  });
});
