/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockDeserialize = jest.fn(() => ({}));

jest.mock('../services', () => ({
  getFormatService: jest.fn(() => ({
    deserialize: mockDeserialize,
  })),
}));

import { Datatable } from '@kbn/expressions-plugin';
import { AggTypes } from '../../common';
import { TableVisConfig } from '../types';
import { createFormattedTable } from './create_formatted_table';

const visConfig: TableVisConfig = {
  perPage: 10,
  showPartialRows: false,
  showMetricsAtAllLevels: false,
  showToolbar: false,
  showTotal: false,
  totalFunc: AggTypes.SUM,
  percentageCol: '',
  title: 'My data table',
  buckets: [
    {
      accessor: 1,
      format: { id: 'string', params: {} },
      type: 'vis_dimension',
    },
  ],
  metrics: [{ accessor: 0, format: { id: 'number', params: {} }, type: 'vis_dimension' }],
};

describe('createFormattedTable', () => {
  const table: Datatable = {
    columns: [
      { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
      { id: 'col-1-5', name: 'category.keyword: Descending', meta: { type: 'string' } },
      { id: 'col-1-2', name: 'Gender', meta: { type: 'string' } },
    ],
    rows: [
      { 'col-0-1': 1, 'col-1-5': "Women's Clothing", 'col-1-2': 'Men' },
      { 'col-0-1': 6, 'col-1-5': "Women's Clothing", 'col-1-2': 'Men' },
    ],
    type: 'datatable',
  };

  it('should create formatted columns from data response and flter out non-dimension columns', () => {
    const output = createFormattedTable(table, visConfig);

    // column to split is filtered out of real data representing
    expect(output.columns).toEqual([table.columns[0], table.columns[1]]);
    expect(output.rows).toEqual(table.rows);
    expect(output.formattedColumns).toEqual({
      'col-0-1': {
        filterable: false,
        formatter: {},
        title: 'Count',
      },
      'col-1-5': {
        filterable: true,
        formatter: {},
        title: 'category.keyword: Descending',
      },
    });
  });

  it('should add total sum to numeric columns', () => {
    mockDeserialize.mockImplementationOnce(() => ({
      allowsNumericalAggregations: true,
      convert: jest.fn((number) => number),
    }));
    const output = createFormattedTable(table, visConfig);

    expect(output.formattedColumns).toEqual({
      'col-0-1': {
        filterable: false,
        formatter: {
          allowsNumericalAggregations: true,
          convert: expect.any(Function),
        },
        title: 'Count',
        sumTotal: 7,
        total: 7,
        formattedTotal: 7,
      },
      'col-1-5': {
        filterable: true,
        formatter: {},
        title: 'category.keyword: Descending',
      },
    });
  });

  it('should add total average to numeric columns', () => {
    mockDeserialize.mockImplementationOnce(() => ({
      allowsNumericalAggregations: true,
      convert: jest.fn((number) => number),
    }));
    const output = createFormattedTable(table, { ...visConfig, totalFunc: AggTypes.AVG });

    expect(output.formattedColumns).toEqual({
      'col-0-1': {
        filterable: false,
        formatter: {
          allowsNumericalAggregations: true,
          convert: expect.any(Function),
        },
        title: 'Count',
        sumTotal: 7,
        total: 3.5,
        formattedTotal: 3.5,
      },
      'col-1-5': {
        filterable: true,
        formatter: {},
        title: 'category.keyword: Descending',
      },
    });
  });

  it('should find min value as total', () => {
    mockDeserialize.mockImplementationOnce(() => ({
      allowsNumericalAggregations: true,
      convert: jest.fn((number) => number),
    }));
    const output = createFormattedTable(table, { ...visConfig, totalFunc: AggTypes.MIN });

    expect(output.formattedColumns).toEqual({
      'col-0-1': {
        filterable: false,
        formatter: {
          allowsNumericalAggregations: true,
          convert: expect.any(Function),
        },
        title: 'Count',
        sumTotal: 7,
        total: 1,
        formattedTotal: 1,
      },
      'col-1-5': {
        filterable: true,
        formatter: {},
        title: 'category.keyword: Descending',
      },
    });
  });

  it('should find max value as total', () => {
    mockDeserialize.mockImplementationOnce(() => ({
      allowsNumericalAggregations: true,
      convert: jest.fn((number) => number),
    }));
    const output = createFormattedTable(table, { ...visConfig, totalFunc: AggTypes.MAX });

    expect(output.formattedColumns).toEqual({
      'col-0-1': {
        filterable: false,
        formatter: {
          allowsNumericalAggregations: true,
          convert: expect.any(Function),
        },
        title: 'Count',
        sumTotal: 7,
        total: 6,
        formattedTotal: 6,
      },
      'col-1-5': {
        filterable: true,
        formatter: {},
        title: 'category.keyword: Descending',
      },
    });
  });

  it('should add rows count as total', () => {
    mockDeserialize.mockImplementationOnce(() => ({
      allowsNumericalAggregations: true,
      convert: jest.fn((number) => number),
    }));
    const output = createFormattedTable(table, { ...visConfig, totalFunc: AggTypes.COUNT });

    expect(output.formattedColumns).toEqual({
      'col-0-1': {
        filterable: false,
        formatter: {
          allowsNumericalAggregations: true,
          convert: expect.any(Function),
        },
        title: 'Count',
        sumTotal: 7,
        total: 2,
        formattedTotal: 2,
      },
      'col-1-5': {
        filterable: true,
        formattedTotal: 2,
        formatter: {},
        sumTotal: "0Women's ClothingWomen's Clothing",
        title: 'category.keyword: Descending',
        total: 2,
      },
    });
  });
});
