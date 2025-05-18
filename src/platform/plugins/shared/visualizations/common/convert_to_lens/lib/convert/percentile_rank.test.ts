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
import { convertToPercentileRankColumn } from './percentile_rank';
import { PercentileRanksColumn } from './types';

const mockGetFieldNameFromField = jest.fn();
const mockGetFieldByName = jest.fn();
const mockGetLabel = jest.fn();
const mockGetLabelForPercentile = jest.fn();

jest.mock('../utils', () => ({
  getFieldNameFromField: jest.fn(() => mockGetFieldNameFromField()),
  getLabel: jest.fn(() => mockGetLabel()),
  getLabelForPercentile: jest.fn(() => mockGetLabelForPercentile()),
}));

describe('convertToPercentileRankColumn', () => {
  const visType = 'heatmap';
  const dataView = stubLogstashDataView;
  const field = dataView.fields[0].displayName;
  const aggId = 'pr.10';
  const value = 10;
  const values = [value];

  const agg: SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.PERCENTILE_RANKS,
    aggParams: { field, values },
    aggId,
  };
  const singlePercentileRankAgg: SchemaConfig<METRIC_TYPES.SINGLE_PERCENTILE_RANK> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.SINGLE_PERCENTILE_RANK,
    aggParams: { field, value },
    aggId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFieldNameFromField.mockReturnValue(dataView.fields[0]);
    mockGetFieldByName.mockReturnValue(dataView.fields[0]);
    mockGetLabel.mockReturnValue('someLabel');
    mockGetLabelForPercentile.mockReturnValue('someOtherLabel');
    dataView.getFieldByName = mockGetFieldByName;
  });

  test.each<
    [
      string,
      Parameters<typeof convertToPercentileRankColumn>,
      Partial<PercentileRanksColumn> | null
    ]
  >([
    ['null if no percents', [{ agg: { ...agg, aggId: 'pr' }, dataView, visType }], null],
    [
      'null if no value',
      [{ agg: { ...singlePercentileRankAgg, aggParams: undefined }, dataView, visType }],
      null,
    ],
    ['null if no aggId', [{ agg: { ...agg, aggId: undefined }, dataView, visType }], null],
    ['null if no aggParams', [{ agg: { ...agg, aggParams: undefined }, dataView, visType }], null],
    [
      'null if aggId is invalid',
      [{ agg: { ...agg, aggId: 'pr.invalid' }, dataView, visType }],
      null,
    ],
    [
      'null if values are undefined',
      [{ agg: { ...agg, aggParams: { values: undefined, field } }, dataView, visType }],
      null,
    ],
    [
      'null if values are empty',
      [{ agg: { ...agg, aggParams: { values: [], field } }, dataView, visType }],
      null,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileRankColumn(...input)).toBeNull();
    } else {
      expect(convertToPercentileRankColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });

  test('should return null if field is not specified', () => {
    mockGetFieldNameFromField.mockReturnValue(null);
    expect(convertToPercentileRankColumn({ agg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(0);
  });

  test('should return null if field absent at the index pattern', () => {
    mockGetFieldByName.mockReturnValueOnce(null);
    dataView.getFieldByName = mockGetFieldByName;

    expect(convertToPercentileRankColumn({ agg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return percentile rank column for percentile ranks', () => {
    expect(convertToPercentileRankColumn({ agg, dataView, visType })).toEqual(
      expect.objectContaining({
        dataType: 'number',
        label: 'someOtherLabel',
        meta: { aggId: 'pr.10' },
        operationType: 'percentile_rank',
        params: { value: 10 },
        sourceField: 'bytes',
      })
    );
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return percentile rank column for single percentile rank', () => {
    expect(
      convertToPercentileRankColumn({ agg: singlePercentileRankAgg, dataView, visType })
    ).toEqual(
      expect.objectContaining({
        dataType: 'number',
        label: 'someOtherLabel',
        meta: { aggId: 'pr.10' },
        operationType: 'percentile_rank',
        params: { value: 10 },
        sourceField: 'bytes',
      })
    );
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });
});
