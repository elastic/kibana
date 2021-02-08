/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockConverter = jest.fn((name) => `By ${name}`);

jest.mock('../services', () => ({
  getFormatService: jest.fn(() => ({
    deserialize: jest.fn(() => ({
      convert: mockConverter,
    })),
  })),
}));

jest.mock('./create_formatted_table', () => ({
  createFormattedTable: jest.fn((data) => ({
    ...data,
    formattedColumns: {},
  })),
}));

jest.mock('./add_percentage_column', () => ({
  addPercentageColumn: jest.fn((data, column) => ({
    ...data,
    percentage: `${column} with percentage`,
  })),
}));

import { Datatable } from 'src/plugins/expressions';
import { SchemaConfig } from 'src/plugins/visualizations/public';
import { AggTypes } from '../../common';
import { TableGroup, TableVisConfig } from '../types';
import { addPercentageColumn } from './add_percentage_column';
import { createFormattedTable } from './create_formatted_table';
import { tableVisResponseHandler } from './table_vis_response_handler';

const visConfig: TableVisConfig = {
  perPage: 10,
  showPartialRows: false,
  showMetricsAtAllLevels: false,
  showToolbar: false,
  showTotal: false,
  totalFunc: AggTypes.AVG,
  percentageCol: '',
  title: 'My data table',
  dimensions: {
    buckets: [],
    metrics: [],
  },
};

describe('tableVisResponseHandler', () => {
  describe('basic table', () => {
    const input: Datatable = {
      columns: [],
      rows: [],
      type: 'datatable',
    };

    it('should create formatted table for basic usage', () => {
      const output = tableVisResponseHandler(input, visConfig);

      expect(output.direction).toBeUndefined();
      expect(output.tables.length).toEqual(0);
      expect(addPercentageColumn).not.toHaveBeenCalled();
      expect(createFormattedTable).toHaveBeenCalledWith(input, visConfig);
      expect(output.table).toEqual({
        ...input,
        formattedColumns: {},
      });
    });

    it('should add a percentage column if it is set', () => {
      const output = tableVisResponseHandler(input, { ...visConfig, percentageCol: 'Count' });
      expect(output.table).toEqual({
        ...input,
        formattedColumns: {},
        percentage: 'Count with percentage',
      });
    });
  });

  describe('split table', () => {
    const input: Datatable = {
      columns: [
        { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
        { id: 'col-1-2', name: 'Gender', meta: { type: 'string' } },
      ],
      rows: [
        { 'col-0-1': 1, 'col-1-2': 'Men' },
        { 'col-0-1': 3, 'col-1-2': 'Women' },
        { 'col-0-1': 6, 'col-1-2': 'Men' },
      ],
      type: 'datatable',
    };
    const split: SchemaConfig[] = [
      {
        accessor: 1,
        label: 'Split',
        format: {},
        params: {},
        aggType: 'terms',
      },
    ];
    const expectedOutput: TableGroup[] = [
      {
        title: 'By Men: Gender',
        table: {
          columns: input.columns,
          rows: [input.rows[0], input.rows[2]],
          formattedColumns: {},
        },
      },
      {
        title: 'By Women: Gender',
        table: {
          columns: input.columns,
          rows: [input.rows[1]],
          formattedColumns: {},
        },
      },
    ];

    it('should split data by row', () => {
      const output = tableVisResponseHandler(input, {
        ...visConfig,
        dimensions: { ...visConfig.dimensions, splitRow: split },
      });

      expect(output.direction).toEqual('row');
      expect(output.table).toBeUndefined();
      expect(output.tables).toEqual(expectedOutput);
    });

    it('should split data by column', () => {
      const output = tableVisResponseHandler(input, {
        ...visConfig,
        dimensions: { ...visConfig.dimensions, splitColumn: split },
      });

      expect(output.direction).toEqual('column');
      expect(output.table).toBeUndefined();
      expect(output.tables).toEqual(expectedOutput);
    });

    it('should add  percentage columns to each table', () => {
      const output = tableVisResponseHandler(input, {
        ...visConfig,
        percentageCol: 'Count',
        dimensions: { ...visConfig.dimensions, splitColumn: split },
      });

      expect(output.direction).toEqual('column');
      expect(output.table).toBeUndefined();
      expect(output.tables).toEqual([
        {
          ...expectedOutput[0],
          table: { ...expectedOutput[0].table, percentage: 'Count with percentage' },
        },
        {
          ...expectedOutput[1],
          table: { ...expectedOutput[1].table, percentage: 'Count with percentage' },
        },
      ]);
    });
  });
});
