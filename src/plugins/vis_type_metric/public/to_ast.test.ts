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

import { toExpressionAst } from './to_ast';
import { Vis } from '../../visualizations/public';

describe('metric vis toExpressionAst function', () => {
  let vis: Vis;

  beforeEach(() => {
    vis = {
      isHierarchical: () => false,
      type: {},
      params: {
        percentageMode: false,
      },
      data: {
        indexPattern: { id: '123' } as any,
        aggs: {
          getResponseAggs: () => [],
          aggs: [],
        } as any,
      },
    } as any;
  });

  it('without params', () => {
    vis.params = { metric: {} };
    const actual = toExpressionAst(vis, {});
    expect(actual).toMatchSnapshot();
  });

  it('with percentage mode should have percentage format', () => {
    vis.params = { metric: { percentageMode: true } };
    const actual = toExpressionAst(vis, {});
    expect(actual).toMatchSnapshot();
  });
});
