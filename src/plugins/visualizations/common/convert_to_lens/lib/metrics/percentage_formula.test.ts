/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { getPercentageColumnFormulaColumn } from './percentage_formula';
import { FormulaColumn } from '../../types';
import { SchemaConfig } from '../../..';

const mockGetFormulaForAgg = jest.fn();
const mockCreateFormulaColumn = jest.fn();

jest.mock('./formula', () => ({
  getFormulaForAgg: jest.fn(() => mockGetFormulaForAgg()),
}));

jest.mock('../convert', () => ({
  createFormulaColumn: jest.fn((formula) => mockCreateFormulaColumn(formula)),
}));

describe('getPercentageColumnFormulaColumn', () => {
  const visType = 'heatmap';
  const dataView = stubLogstashDataView;
  const field = stubLogstashDataView.fields[0].name;
  const aggs: Array<SchemaConfig<METRIC_TYPES>> = [
    {
      aggId: '1',
      aggType: METRIC_TYPES.AVG,
      aggParams: { field },
      accessor: 0,
      params: {},
      label: 'average',
      format: {},
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<
    [
      string,
      Parameters<typeof getPercentageColumnFormulaColumn>,
      () => void,
      Partial<FormulaColumn> | null
    ]
  >([
    [
      'null if cannot build formula for provided agg',
      [{ agg: aggs[0], aggs, dataView, visType }],
      () => {
        mockGetFormulaForAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'null if cannot create formula column for provided arguments',
      [{ agg: aggs[0], aggs, dataView, visType }],
      () => {
        mockGetFormulaForAgg.mockReturnValue('test-formula');
        mockCreateFormulaColumn.mockReturnValue(null);
      },
      null,
    ],
    [
      'formula column if provided arguments are valid',
      [{ agg: aggs[0], aggs, dataView, visType }],
      () => {
        mockGetFormulaForAgg.mockReturnValue('test-formula');
        mockCreateFormulaColumn.mockImplementation((formula) => ({
          operationType: 'formula',
          params: { formula },
          label: 'Average',
        }));
      },
      {
        operationType: 'formula',
        params: {
          formula: `(test-formula) / overall_sum(test-formula)`,
          format: { id: 'percent' },
        },
        label: `Average percentages`,
      },
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(getPercentageColumnFormulaColumn(...input)).toBeNull();
    } else {
      expect(getPercentageColumnFormulaColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
