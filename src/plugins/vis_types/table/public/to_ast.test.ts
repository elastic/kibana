/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { toExpressionAst } from './to_ast';
import { AggTypes, TableVisParams } from '../common';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';

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

const mockTableExpressionFunction = {
  addArgument: jest.fn(),
};

const mockTableExpression = {
  toAst: jest.fn(),
};

jest.mock('@kbn/visualizations-plugin/public', () => ({
  getVisSchemas: () => mockSchemas,
}));

jest.mock('@kbn/expressions-plugin/public', () => ({
  buildExpression: jest.fn(() => mockTableExpression),
  buildExpressionFunction: jest.fn(() => mockTableExpressionFunction),
}));

describe('table vis toExpressionAst function', () => {
  let vis: Vis<TableVisParams>;

  beforeEach(() => {
    vis = {
      isHierarchical: () => false,
      type: {},
      params: {
        perPage: 20,
        percentageCol: 'Count',
        showLabel: false,
        showMetricsAtAllLevels: true,
        showPartialRows: true,
        showTotal: true,
        showToolbar: false,
        totalFunc: AggTypes.SUM,
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create table expression ast', () => {
    toExpressionAst(vis, {} as any);

    expect((buildExpressionFunction as jest.Mock).mock.calls.length).toEqual(5);
    expect((buildExpressionFunction as jest.Mock).mock.calls[0]).toEqual([
      'indexPatternLoad',
      { id: '123' },
    ]);
    expect((buildExpressionFunction as jest.Mock).mock.calls[1]).toEqual([
      'esaggs',
      {
        index: expect.any(Object),
        metricsAtAllLevels: false,
        partialRows: true,
        aggs: [],
      },
    ]);
    // prepare metrics dimensions
    expect((buildExpressionFunction as jest.Mock).mock.calls[2]).toEqual([
      'visdimension',
      { accessor: 1 },
    ]);
    // prepare buckets dimensions
    expect((buildExpressionFunction as jest.Mock).mock.calls[3]).toEqual([
      'visdimension',
      { accessor: 0 },
    ]);
    // prepare table expression function
    expect((buildExpressionFunction as jest.Mock).mock.calls[4]).toEqual([
      'kibana_table',
      {
        buckets: [mockTableExpression],
        metrics: [mockTableExpression],
        perPage: 20,
        percentageCol: 'Count',
        row: undefined,
        showMetricsAtAllLevels: true,
        showPartialRows: true,
        showToolbar: false,
        showTotal: true,
        title: undefined,
        totalFunc: 'sum',
      },
    ]);
  });

  it('should filter out invalid vis params', () => {
    // @ts-expect-error
    vis.params.sort = { columnIndex: null };
    toExpressionAst(vis, {} as any);
    expect((buildExpressionFunction as jest.Mock).mock.calls[4][1].sort).toBeUndefined();
  });
});
