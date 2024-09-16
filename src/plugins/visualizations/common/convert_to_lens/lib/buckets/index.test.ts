/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { BUCKET_TYPES, METRIC_TYPES } from '@kbn/data-plugin/common';
import { BucketAggs, convertBucketToColumns } from '.';
import { DateHistogramColumn, FiltersColumn, RangeColumn, TermsColumn } from '../../types';
import { AggBasedColumn, SchemaConfig } from '../../..';

const mockConvertToDateHistogramColumn = jest.fn();
const mockConvertToFiltersColumn = jest.fn();
const mockConvertToTermsColumn = jest.fn();
const mockConvertToRangeColumn = jest.fn();

jest.mock('../convert', () => ({
  convertToDateHistogramColumn: jest.fn(() => mockConvertToDateHistogramColumn()),
  convertToFiltersColumn: jest.fn(() => mockConvertToFiltersColumn()),
  convertToTermsColumn: jest.fn(() => mockConvertToTermsColumn()),
  convertToRangeColumn: jest.fn(() => mockConvertToRangeColumn()),
}));

describe('convertBucketToColumns', () => {
  const field = stubLogstashDataView.fields[0].name;
  const dateField = stubLogstashDataView.fields.find((f) => f.type === 'date')!.name;
  const bucketAggs: Array<SchemaConfig<BucketAggs | BUCKET_TYPES.DATE_RANGE>> = [
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.FILTERS,
      aggParams: {
        filters: [],
      },
    },
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.DATE_HISTOGRAM,
      aggParams: {
        field,
      },
    },
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.TERMS,
      aggParams: {
        field,
        orderBy: '_key',
      },
    },
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.TERMS,
      aggParams: {
        field: dateField,
        orderBy: '_key',
      },
    },
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.HISTOGRAM,
      aggParams: {
        field,
        interval: '1h',
      },
    },
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.RANGE,
      aggParams: {
        field,
      },
    },
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: BUCKET_TYPES.DATE_RANGE,
      aggParams: {
        field,
      },
    },
  ];
  const aggs: Array<SchemaConfig<METRIC_TYPES>> = [
    {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG,
      aggParams: {
        field,
      },
    },
  ];
  const metricColumns: AggBasedColumn[] = [
    {
      columnId: 'column-1',
      operationType: 'average',
      isBucketed: false,
      isSplit: false,
      sourceField: field,
      dataType: 'number',
      params: {},
      meta: {
        aggId: '1',
      },
    },
  ];
  const visType = 'heatmap';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<
    [
      string,
      Parameters<typeof convertBucketToColumns>,
      () => void,
      Partial<TermsColumn | DateHistogramColumn | FiltersColumn | RangeColumn> | null
    ]
  >([
    [
      'null if bucket agg type is not supported',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[6], aggs, metricColumns, visType }],
      () => {},
      null,
    ],
    [
      'null if bucket agg does not have aggParams',
      [
        {
          dataView: stubLogstashDataView,
          agg: { ...bucketAggs[0], aggParams: undefined },
          aggs,
          metricColumns,
          visType,
        },
      ],
      () => {},
      null,
    ],
    [
      'filters column if bucket agg is valid filters agg',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[0], aggs, metricColumns, visType }],
      () => {
        mockConvertToFiltersColumn.mockReturnValue({
          operationType: 'filters',
        });
      },
      {
        operationType: 'filters',
      },
    ],
    [
      'date histogram column if bucket agg is valid date histogram agg',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[1], aggs, metricColumns, visType }],
      () => {
        mockConvertToDateHistogramColumn.mockReturnValue({
          operationType: 'date_histogram',
        });
      },
      {
        operationType: 'date_histogram',
      },
    ],
    [
      'date histogram column if bucket agg is valid terms agg with date field',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[3], aggs, metricColumns, visType }],
      () => {
        mockConvertToDateHistogramColumn.mockReturnValue({
          operationType: 'date_histogram',
        });
      },
      {
        operationType: 'date_histogram',
      },
    ],
    [
      'terms column if bucket agg is valid terms agg with no date field',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[2], aggs, metricColumns, visType }],
      () => {
        mockConvertToTermsColumn.mockReturnValue({
          operationType: 'terms',
        });
      },
      {
        operationType: 'terms',
      },
    ],
    [
      'range column if bucket agg is valid histogram agg',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[4], aggs, metricColumns, visType }],
      () => {
        mockConvertToRangeColumn.mockReturnValue({
          operationType: 'range',
        });
      },
      {
        operationType: 'range',
      },
    ],
    [
      'range column if bucket agg is valid range agg',
      [{ dataView: stubLogstashDataView, agg: bucketAggs[5], aggs, metricColumns, visType }],
      () => {
        mockConvertToRangeColumn.mockReturnValue({
          operationType: 'range',
        });
      },
      {
        operationType: 'range',
      },
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(convertBucketToColumns(...input)).toBeNull();
    } else {
      expect(convertBucketToColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
