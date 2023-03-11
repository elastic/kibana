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
import { convertToPercentileColumn } from './percentile';
import { PercentileColumn } from './types';

const mockGetFieldNameFromField = jest.fn();
const mockGetFieldByName = jest.fn();
const mockGetLabel = jest.fn();
const mockGetLabelForPercentile = jest.fn();

jest.mock('../utils', () => ({
  getFieldNameFromField: jest.fn(() => mockGetFieldNameFromField()),
  getLabel: jest.fn(() => mockGetLabel()),
  getLabelForPercentile: jest.fn(() => mockGetLabelForPercentile()),
}));

describe('convertToPercentileColumn', () => {
  const visType = 'heatmap';
  const dataView = stubLogstashDataView;
  const field = dataView.fields[0].displayName;
  const aggId = 'pr.10';
  const percentile = 10;
  const percents = [percentile];

  const agg: SchemaConfig<METRIC_TYPES.PERCENTILES> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.PERCENTILES,
    aggParams: { field, percents },
    aggId,
  };
  const singlePercentileRankAgg: SchemaConfig<METRIC_TYPES.SINGLE_PERCENTILE> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.SINGLE_PERCENTILE,
    aggParams: { field, percentile },
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
    [string, Parameters<typeof convertToPercentileColumn>, Partial<PercentileColumn> | null]
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
      [{ agg: { ...agg, aggParams: { percents: undefined, field } }, dataView, visType }],
      null,
    ],
    [
      'null if values are empty',
      [{ agg: { ...agg, aggParams: { percents: [], field } }, dataView, visType }],
      null,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileColumn(...input)).toBeNull();
    } else {
      expect(convertToPercentileColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });

  test('should return null if field is not specified', () => {
    mockGetFieldNameFromField.mockReturnValue(null);
    expect(convertToPercentileColumn({ agg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(0);
  });

  test('should return null if field absent at the index pattern', () => {
    mockGetFieldByName.mockReturnValueOnce(null);
    dataView.getFieldByName = mockGetFieldByName;

    expect(convertToPercentileColumn({ agg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return percentile rank column for percentiles', () => {
    expect(convertToPercentileColumn({ agg, dataView, visType })).toEqual(
      expect.objectContaining({
        dataType: 'number',
        label: 'someOtherLabel',
        meta: { aggId: 'pr.10' },
        operationType: 'percentile',
        params: { percentile: 10 },
        sourceField: 'bytes',
      })
    );
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return percentile rank column for single percentile', () => {
    expect(convertToPercentileColumn({ agg: singlePercentileRankAgg, dataView, visType })).toEqual(
      expect.objectContaining({
        dataType: 'number',
        label: 'someOtherLabel',
        meta: { aggId: 'pr.10' },
        operationType: 'percentile',
        params: { percentile: 10 },
        sourceField: 'bytes',
      })
    );
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });
});
