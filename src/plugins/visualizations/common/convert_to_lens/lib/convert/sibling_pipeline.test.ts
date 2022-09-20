/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { AggBasedColumn } from './types';
import { SchemaConfig } from '../../..';
import { convertToSiblingPipelineColumns } from './sibling_pipeline';

const mockConvertMetricToColumns = jest.fn();

jest.mock('../metrics', () => ({
  convertMetricToColumns: jest.fn(() => mockConvertMetricToColumns()),
}));

describe('convertToSiblingPipelineColumns', () => {
  const field = stubLogstashDataView.fields[0].name;
  const aggs: SchemaConfig<METRIC_TYPES>[] = [
    {
      aggId: '1',
      aggType: METRIC_TYPES.AVG,
      aggParams: { field },
      accessor: 0,
      params: {},
      label: 'average',
      format: {},
    },
    {
      aggId: '1',
      aggType: METRIC_TYPES.AVG_BUCKET,
      aggParams: {
        customMetric: {
          id: '1-metric',
          params: {
            field,
          },
          type: { name: 'avg' },
          toSerializedFieldFormat: () => ({}),
        } as IAggConfig,
      },
      accessor: 0,
      params: {},
      label: 'Overall Average of Average',
      format: {},
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<
    [
      string,
      Parameters<typeof convertToSiblingPipelineColumns>,
      () => void,
      Partial<AggBasedColumn> | null
    ]
  >([
    [
      'null if agg params of sibling pipeline agg is not provided',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: { ...aggs[1], aggParams: undefined } as SchemaConfig<METRIC_TYPES.AVG_BUCKET>,
        },
      ],
      () => {},
      null,
    ],
    [
      'null if cutom metric of sibling pipeline agg is not provided',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: {
            ...aggs[1],
            aggParams: { customMetric: undefined },
          } as SchemaConfig<METRIC_TYPES.AVG_BUCKET>,
        },
      ],
      () => {},
      null,
    ],
    [
      'null if cutom metric of parent pipeline agg is invalid agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.AVG_BUCKET>,
        },
      ],
      () => {
        mockConvertMetricToColumns.mockReturnValue(null);
      },
      null,
    ],
    [
      'custom metric columns if cutom metric of sibling pipeline agg is valid agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.AVG_BUCKET>,
        },
      ],
      () => {
        mockConvertMetricToColumns.mockReturnValue([
          {
            columnId: 'test-id-1',
            operationType: 'average',
            sourceField: field,
          },
        ]);
      },
      {
        columnId: 'test-id-1',
        operationType: 'average',
        sourceField: field,
      },
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(convertToSiblingPipelineColumns(...input)).toBeNull();
    } else {
      expect(convertToSiblingPipelineColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
