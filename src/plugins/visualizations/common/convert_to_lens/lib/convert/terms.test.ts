/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { AggParamsTerms, IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { convertToTermsColumn } from './terms';
import { AggBasedColumn, TermsColumn } from './types';
import { SchemaConfig } from '../../..';

const mockConvertMetricToColumns = jest.fn();

jest.mock('../metrics', () => ({
  convertMetricToColumns: jest.fn(() => mockConvertMetricToColumns()),
}));

jest.mock('../../../vis_schemas', () => ({
  convertToSchemaConfig: jest.fn(() => ({})),
}));

describe('convertToDateHistogramColumn', () => {
  const aggId = `some-id`;
  const aggParams: AggParamsTerms = {
    field: stubLogstashDataView.fields[0].name,
    orderBy: '_key',
    order: {
      value: 'asc',
      text: '',
    },
    size: 5,
  };
  const aggs: SchemaConfig<METRIC_TYPES>[] = [
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
        field: stubLogstashDataView.fields[0].name,
      },
    },
  ];
  const metricColumns: AggBasedColumn[] = [
    {
      columnId: 'column-1',
      operationType: 'average',
      isBucketed: false,
      isSplit: false,
      sourceField: stubLogstashDataView.fields[0].name,
      dataType: 'number',
      params: {},
      meta: {
        aggId: '1',
      },
    },
  ];

  test.each<
    [
      string,
      Parameters<typeof convertToTermsColumn>,
      Partial<TermsColumn> | null,
      () => void
    ]
  >([
    [
      'null if dataview does not include field from terms params',
      [
        aggId,
        {
          aggParams: { ...aggParams, field: '' },
          dataView: stubLogstashDataView,
          aggs,
          metricColumns,
        },
        '',
      ],
      null,
      () => {},
    ],
    [
      'terms column with alphabetical orderBy',
      [aggId, { aggParams, dataView: stubLogstashDataView, aggs, metricColumns }, ''],
      {
        operationType: 'terms',
        sourceField: stubLogstashDataView.fields[0].name,
        isBucketed: true,
        params: {
          size: 5,
          include: [],
          exclude: [],
          parentFormat: { id: 'terms' },
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
        },
      },
      () => {},
    ],
    [
      'terms column with column orderBy if provided column for orderBy is exist',
      [
        aggId,
        {
          aggParams: { ...aggParams, orderBy: '1' },
          dataView: stubLogstashDataView,
          aggs,
          metricColumns,
        },
        '',
      ],
      {
        operationType: 'terms',
        sourceField: stubLogstashDataView.fields[0].name,
        isBucketed: true,
        params: {
          size: 5,
          include: [],
          exclude: [],
          parentFormat: { id: 'terms' },
          orderBy: { type: 'column', columnId: metricColumns[0].columnId },
          orderAgg: metricColumns[0],
          orderDirection: 'asc',
        },
      },
      () => {},
    ],
    [
      'null if provided column for orderBy is not exist',
      [
        aggId,
        {
          aggParams: { ...aggParams, orderBy: '2' },
          dataView: stubLogstashDataView,
          aggs,
          metricColumns,
        },
        '',
      ],
      null,
      () => {},
    ],
    [
      'null if provided custom orderBy without orderAgg',
      [
        aggId,
        {
          aggParams: { ...aggParams, orderBy: 'custom', orderAgg: undefined },
          dataView: stubLogstashDataView,
          aggs,
          metricColumns,
        },
        '',
      ],
      null,
      () => {},
    ],
    [
      'null if provided custom orderBy and not valid orderAgg',
      [
        aggId,
        {
          aggParams: { ...aggParams, orderBy: 'custom', orderAgg: {} as IAggConfig },
          dataView: stubLogstashDataView,
          aggs,
          metricColumns,
        },
        '',
      ],
      null,
      () => {
        mockConvertMetricToColumns.mockReturnValue(null);
      },
    ],
    [
      'terms column with custom orderBy and prepared orderAgg',
      [
        aggId,
        {
          aggParams: { ...aggParams, orderBy: 'custom', orderAgg: {} as IAggConfig },
          dataView: stubLogstashDataView,
          aggs,
          metricColumns,
        },
        '',
      ],
      {
        operationType: 'terms',
        sourceField: stubLogstashDataView.fields[0].name,
        isBucketed: true,
        params: {
          size: 5,
          include: [],
          exclude: [],
          parentFormat: { id: 'terms' },
          orderBy: { type: 'custom' },
          orderAgg: metricColumns[0],
          orderDirection: 'asc',
        },
      },
      () => {
        mockConvertMetricToColumns.mockReturnValue(metricColumns);
      },
    ],
  ])('should return %s', (_, input, expected, actions) => {
    actions();
    if (expected === null) {
      expect(convertToTermsColumn(...input)).toBeNull();
    } else {
      expect(convertToTermsColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
