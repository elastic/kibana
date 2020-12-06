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

import { Vis } from 'src/plugins/visualizations/public';
import { toExpressionAst } from './to_ast';
import { AggTypes, TableVisParams } from './types';

const mockSchemas = {
  metric: [{ accessor: 1, format: { id: 'number' }, params: {}, label: 'Count', aggType: 'count' }],
  bucket: [
    {
      accessor: 0,
      format: { id: 'date', params: { pattern: 'YYYY-MM-DD HH:mm' } },
      params: {},
      label: 'order_date per 3 hours',
      aggType: 'date_histogram',
    },
  ],
};

jest.mock('../../visualizations/public', () => ({
  getVisSchemas: () => mockSchemas,
}));

describe('table vis toExpressionAst function', () => {
  let vis: Vis<TableVisParams>;

  beforeEach(() => {
    vis = {
      isHierarchical: () => false,
      type: {},
      params: {
        showLabel: false,
      },
      data: {
        indexPattern: { id: '123' },
        aggs: {
          getResponseAggs: () => [],
          aggs: [],
        },
      },
    } as any;
  });

  it('should match snapshot without params', () => {
    const actual = toExpressionAst(vis, {} as any);
    expect(actual).toMatchSnapshot();
  });

  it('should match snapshot based on params & dimensions', () => {
    vis.params = {
      perPage: 20,
      percentageCol: 'Count',
      showMetricsAtAllLevels: true,
      showPartialRows: true,
      showTotal: true,
      sort: { columnIndex: null, direction: null },
      totalFunc: AggTypes.SUM,
    };
    const actual = toExpressionAst(vis, {} as any);
    expect(actual).toMatchSnapshot();
  });
});
