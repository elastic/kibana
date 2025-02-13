/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggParamsTopHit, METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { convertToLastValueColumn } from './last_value';
import { FiltersColumn } from './types';

const mockGetFieldNameFromField = jest.fn();
const mockGetFieldByName = jest.fn();
const mockGetLabel = jest.fn();

jest.mock('../utils', () => ({
  getFieldNameFromField: jest.fn(() => mockGetFieldNameFromField()),
  getLabel: jest.fn(() => mockGetLabel()),
}));

describe('convertToLastValueColumn', () => {
  const visType = 'heatmap';
  const dataView = stubLogstashDataView;
  const sortField = dataView.fields[0];

  const topHitAggParams: AggParamsTopHit = {
    sortOrder: {
      value: 'desc',
      text: 'some text',
    },
    sortField,
    field: '',
    aggregate: 'min',
    size: 1,
  };

  const topHitAgg: SchemaConfig<METRIC_TYPES.TOP_HITS> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.TOP_HITS,
    aggParams: topHitAggParams,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFieldNameFromField.mockReturnValue(dataView.fields[0]);
    mockGetFieldByName.mockReturnValue(dataView.fields[0]);
    mockGetLabel.mockReturnValue('someLabel');
    dataView.getFieldByName = mockGetFieldByName;
  });

  test.each<[string, Parameters<typeof convertToLastValueColumn>, Partial<FiltersColumn> | null]>([
    [
      'null if top hits size is more than 1',
      [
        {
          agg: { ...topHitAgg, aggParams: { ...topHitAgg.aggParams!, size: 2 } },
          dataView,
          visType,
        },
      ],
      null,
    ],
    [
      'null if top hits sord order is not desc',
      [
        {
          agg: {
            ...topHitAgg,
            aggParams: {
              ...topHitAgg.aggParams!,
              sortOrder: { ...topHitAgg.aggParams!.sortOrder!, value: 'asc' },
            },
          },
          dataView,
          visType,
        },
      ],
      null,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToLastValueColumn(...input)).toBeNull();
    } else {
      expect(convertToLastValueColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });

  test('should skip if top hit field is not specified', () => {
    mockGetFieldNameFromField.mockReturnValue(null);
    expect(convertToLastValueColumn({ agg: topHitAgg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(0);
  });

  test('should skip if top hit field is not present in index pattern', () => {
    mockGetFieldByName.mockReturnValue(null);
    dataView.getFieldByName = mockGetFieldByName;

    expect(convertToLastValueColumn({ agg: topHitAgg, dataView, visType })).toBeNull();
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
    expect(mockGetLabel).toBeCalledTimes(0);
  });

  test('should return top hit column if top hit field is not present in index pattern', () => {
    expect(convertToLastValueColumn({ agg: topHitAgg, dataView, visType })).toEqual(
      expect.objectContaining({
        dataType: 'number',
        label: 'someLabel',
        operationType: 'last_value',
        params: { showArrayValues: true, sortField: 'bytes' },
        sourceField: 'bytes',
      })
    );
    expect(mockGetFieldNameFromField).toBeCalledTimes(1);
    expect(dataView.getFieldByName).toBeCalledTimes(1);
    expect(mockGetLabel).toBeCalledTimes(1);
  });
});
