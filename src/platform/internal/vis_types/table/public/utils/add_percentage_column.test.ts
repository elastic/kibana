/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../services', () => ({
  getFormatService: jest.fn(() => ({
    deserialize: jest.fn(() => 'formatter'),
  })),
}));

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { TableContext } from '../types';
import { addPercentageColumn } from './add_percentage_column';

describe('', () => {
  const table: TableContext = {
    columns: [
      { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
      { id: 'col-1-5', name: 'category.keyword: Descending', meta: { type: 'string' } },
      { id: 'col-1-2', name: 'Gender', meta: { type: 'string' } },
    ],
    rows: [
      { 'col-0-1': 1, 'col-1-5': "Women's Clothing", 'col-1-2': 'Men' },
      { 'col-0-1': 6, 'col-1-5': "Women's Clothing", 'col-1-2': 'Men' },
    ],
    formattedColumns: {
      'col-0-1': {
        sumTotal: 7,
        title: 'Count',
        filterable: false,
        formatter: {} as FieldFormat,
      },
    },
  };

  it('should dnot add percentage column if it was not found', () => {
    const output = addPercentageColumn(table, 'Extra');
    expect(output).toBe(table);
  });

  it('should add a brand new percentage column into table based on data', () => {
    const output = addPercentageColumn(table, 'Count');
    const expectedColumns = [
      table.columns[0],
      {
        id: 'col-0-1-percents',
        meta: {
          params: {
            id: 'percent',
          },
          type: 'number',
        },
        name: 'Count percentages',
      },
      table.columns[1],
      table.columns[2],
    ];
    const expectedRows = [
      { ...table.rows[0], 'col-0-1-percents': 0.14285714285714285 },
      { ...table.rows[1], 'col-0-1-percents': 0.8571428571428571 },
    ];
    expect(output).toEqual({
      columns: expectedColumns,
      rows: expectedRows,
      formattedColumns: {
        ...table.formattedColumns,
        'col-0-1-percents': {
          filterable: false,
          formatter: 'formatter',
          title: 'Count percentages',
        },
      },
    });
  });
});
