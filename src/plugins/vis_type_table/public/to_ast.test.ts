/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      showToolbar: false,
      totalFunc: AggTypes.SUM,
    };
    const actual = toExpressionAst(vis, {} as any);
    expect(actual).toMatchSnapshot();
  });
});
