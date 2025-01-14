/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { convertToStdDeviationFormulaColumns } from './std_deviation';
import { FormulaColumn } from './types';

const mockGetFieldNameFromField = jest.fn();
const mockGetFieldByName = jest.fn();
const mockGetLabel = jest.fn();

jest.mock('../utils', () => ({
  getFieldNameFromField: jest.fn(() => mockGetFieldNameFromField()),
  getLabel: jest.fn(() => mockGetLabel()),
}));

describe('convertToStdDeviationFormulaColumns', () => {
  const visType = 'heatmap';
  const dataView = stubLogstashDataView;
  const stdLowerAggId = 'agg-id.std_lower';
  const stdUpperAggId = 'agg-id.std_upper';
  const label = 'std label';
  const agg: SchemaConfig<METRIC_TYPES.STD_DEV> = {
    accessor: 0,
    label,
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.STD_DEV,
    aggId: stdLowerAggId,
    aggParams: {
      field: dataView.fields[0].displayName,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFieldNameFromField.mockReturnValue(dataView.fields[0].displayName);
    mockGetFieldByName.mockReturnValue(dataView.fields[0]);
    mockGetLabel.mockReturnValue('some label');
    dataView.getFieldByName = mockGetFieldByName;
  });

  test.each<
    [string, Parameters<typeof convertToStdDeviationFormulaColumns>, Partial<FormulaColumn> | null]
  >([
    [
      'null if no aggId is passed',
      [{ agg: { ...agg, aggId: undefined }, dataView, visType }],
      null,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToStdDeviationFormulaColumns(...input)).toBeNull();
    } else {
      expect(convertToStdDeviationFormulaColumns(...input)).toEqual(
        expect.objectContaining(expected)
      );
    }
  });

  test('should return null if field is not present', () => {
    mockGetFieldNameFromField.mockReturnValue(null);
    expect(convertToStdDeviationFormulaColumns({ agg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(0);
  });

  test("should return null if field doesn't exist in dataView", () => {
    mockGetFieldByName.mockReturnValue(null);
    dataView.getFieldByName = mockGetFieldByName;
    expect(convertToStdDeviationFormulaColumns({ agg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return null if agg id is invalid', () => {
    expect(
      convertToStdDeviationFormulaColumns({ agg: { ...agg, aggId: 'some-id' }, dataView, visType })
    ).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return formula column for lower std deviation', () => {
    expect(
      convertToStdDeviationFormulaColumns({
        agg: { ...agg, aggId: stdLowerAggId },
        dataView,
        visType,
      })
    ).toEqual(
      expect.objectContaining({
        label,
        meta: { aggId: 'agg-id.std_lower' },
        operationType: 'formula',
        params: { formula: 'average(bytes) - 2 * standard_deviation(bytes)' },
      })
    );
  });

  test('should return formula column for upper std deviation', () => {
    expect(
      convertToStdDeviationFormulaColumns({
        agg: { ...agg, aggId: stdUpperAggId },
        dataView,
        visType,
      })
    ).toEqual(
      expect.objectContaining({
        label,
        meta: { aggId: 'agg-id.std_upper' },
        operationType: 'formula',
        params: { formula: 'average(bytes) + 2 * standard_deviation(bytes)' },
      })
    );
  });
});
