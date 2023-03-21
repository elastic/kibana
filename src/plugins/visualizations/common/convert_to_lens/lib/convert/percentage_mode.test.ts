/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { convertToColumnInPercentageMode } from './percentage_mode';

const mockGetFormulaForAgg = jest.fn();

jest.mock('../metrics/formula', () => ({
  getFormulaForAgg: jest.fn(() => mockGetFormulaForAgg()),
}));

describe('convertToColumnInPercentageMode', () => {
  const visType = 'heatmap';
  const formula = 'average(some_field)';
  const dataView = stubLogstashDataView;

  const agg: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
    aggParams: {
      field: dataView.fields[0].displayName,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFormulaForAgg.mockReturnValue(formula);
  });

  test('should return null if it is not possible to build the valid formula', () => {
    mockGetFormulaForAgg.mockReturnValue(null);
    expect(convertToColumnInPercentageMode({ agg, dataView, aggs: [agg], visType }, {})).toBeNull();
  });

  test('should return percentage mode over range formula if min and max was passed', () => {
    const formulaColumn = {
      operationType: 'formula',
      params: { format: { id: 'percent' }, formula: `((${formula}) - 0) / (100 - 0)` },
    };
    expect(
      convertToColumnInPercentageMode({ agg, dataView, aggs: [agg], visType }, { min: 0, max: 100 })
    ).toEqual(expect.objectContaining(formulaColumn));
  });

  test('should return percentage mode formula if min and max was not passed', () => {
    const formulaColumn = {
      operationType: 'formula',
      params: { format: { id: 'percent' }, formula: `(${formula}) / 10000` },
    };
    expect(convertToColumnInPercentageMode({ agg, dataView, aggs: [agg], visType }, {})).toEqual(
      expect.objectContaining(formulaColumn)
    );
  });
});
