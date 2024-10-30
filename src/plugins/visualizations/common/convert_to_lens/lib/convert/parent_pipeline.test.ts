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
import { FormulaColumn, AggBasedColumn } from './types';
import { SchemaConfig } from '../../..';
import {
  convertToOtherParentPipelineAggColumns,
  ParentPipelineAggColumn,
  convertToCumulativeSumAggColumn,
} from './parent_pipeline';

const mockGetMetricFromParentPipelineAgg = jest.fn();
const mockGetFormulaForPipelineAgg = jest.fn();
const mockConvertMetricToColumns = jest.fn();
const mockGetFieldByName = jest.fn();
const mockConvertMetricAggregationColumnWithoutSpecialParams = jest.fn();

jest.mock('../utils', () => ({
  getMetricFromParentPipelineAgg: jest.fn(() => mockGetMetricFromParentPipelineAgg()),
  getLabel: jest.fn(() => 'label'),
  getFieldNameFromField: jest.fn(() => 'document'),
}));

jest.mock('./metric', () => ({
  convertMetricAggregationColumnWithoutSpecialParams: jest.fn(() =>
    mockConvertMetricAggregationColumnWithoutSpecialParams()
  ),
}));

jest.mock('../metrics', () => ({
  getFormulaForPipelineAgg: jest.fn(() => mockGetFormulaForPipelineAgg()),
  convertMetricToColumns: jest.fn(() => mockConvertMetricToColumns()),
}));

describe('convertToOtherParentPipelineAggColumns', () => {
  const visType = 'heatmap';
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
    {
      aggId: '1',
      aggType: METRIC_TYPES.MOVING_FN,
      aggParams: { metricAgg: '2' },
      accessor: 0,
      params: {},
      label: 'Moving Average of Average',
      format: {},
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<
    [
      string,
      Parameters<typeof convertToOtherParentPipelineAggColumns>,
      () => void,
      Partial<FormulaColumn> | [Partial<ParentPipelineAggColumn>, Partial<AggBasedColumn>] | null
    ]
  >([
    [
      'null if getMetricFromParentPipelineAgg returns null',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'null if cutom metric of parent pipeline agg is not supported',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.GEO_BOUNDS,
        });
      },
      null,
    ],
    [
      'null if cutom metric of parent pipeline agg is sibling pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.AVG_BUCKET,
        });
      },
      null,
    ],
    [
      'null if cannot build formula if cutom metric of parent pipeline agg is parent pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.MOVING_FN,
        });
        mockGetFormulaForPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'formula column if cutom metric of parent pipeline agg is valid parent pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.MOVING_FN,
        });
        mockGetFormulaForPipelineAgg.mockReturnValue('test-formula');
      },
      {
        operationType: 'formula',
        params: {
          formula: 'test-formula',
        },
      },
    ],
    [
      'null if cutom metric of parent pipeline agg is invalid not pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.AVG,
        });
        mockConvertMetricToColumns.mockReturnValue(null);
      },
      null,
    ],
    [
      'parent pipeline and metric columns if cutom metric of parent pipeline agg is valid not pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.MOVING_FN>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.AVG,
        });
        mockConvertMetricToColumns.mockReturnValue([
          {
            columnId: 'test-id-1',
            operationType: 'average',
            sourceField: field,
          },
        ]);
      },
      [
        { operationType: 'moving_average', references: ['test-id-1'] },
        {
          columnId: 'test-id-1',
          operationType: 'average',
          sourceField: field,
        },
      ],
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(convertToOtherParentPipelineAggColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToOtherParentPipelineAggColumns(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToOtherParentPipelineAggColumns(...input)).toEqual(
        expect.objectContaining(expected)
      );
    }
  });
});

describe('convertToCumulativeSumAggColumn', () => {
  const visType = 'heatmap';
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
    {
      aggId: '1',
      aggType: METRIC_TYPES.CUMULATIVE_SUM,
      aggParams: { metricAgg: '2' },
      accessor: 0,
      params: {},
      label: 'Moving Average of Average',
      format: {},
    },
  ];

  beforeEach(() => {
    mockGetFieldByName.mockReturnValue({
      aggregatable: true,
      type: 'number',
      sourceField: 'bytes',
    });

    stubLogstashDataView.getFieldByName = mockGetFieldByName;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<
    [
      string,
      Parameters<typeof convertToCumulativeSumAggColumn>,
      () => void,
      Partial<FormulaColumn> | [Partial<ParentPipelineAggColumn>, Partial<AggBasedColumn>] | null
    ]
  >([
    [
      'null if cumulative sum does not have aggParams',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: { ...aggs[1], aggParams: undefined } as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'null if getMetricFromParentPipelineAgg returns null',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'null if cutom metric of parent pipeline agg is not supported',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.GEO_BOUNDS,
        });
      },
      null,
    ],
    [
      'null if cutom metric of parent pipeline agg is sibling pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.AVG_BUCKET,
        });
      },
      null,
    ],
    [
      'null if cannot build formula if cutom metric of parent pipeline agg is parent pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.MOVING_FN,
        });
        mockGetFormulaForPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'formula column if cutom metric of parent pipeline agg is valid parent pipeline agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.MOVING_FN,
        });
        mockGetFormulaForPipelineAgg.mockReturnValue('test-formula');
      },
      {
        operationType: 'formula',
        params: {
          formula: 'test-formula',
        },
      },
    ],
    [
      'null if cutom metric of parent pipeline agg is invalid sum or count agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.SUM,
        });
        mockConvertMetricAggregationColumnWithoutSpecialParams.mockReturnValue(null);
      },
      null,
    ],
    [
      'cumulative sum and metric columns if cutom metric of parent pipeline agg is valid sum or count agg',
      [
        {
          dataView: stubLogstashDataView,
          aggs,
          agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
          visType,
        },
      ],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggId: '2-metric',
          aggType: METRIC_TYPES.SUM,
        });
        mockConvertMetricAggregationColumnWithoutSpecialParams.mockReturnValue({
          columnId: 'test-id-1',
          operationType: 'sum',
          sourceField: field,
        });
      },
      [
        { operationType: 'cumulative_sum', references: ['test-id-1'] },
        {
          columnId: 'test-id-1',
          operationType: 'sum',
          sourceField: field,
        },
      ],
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(convertToCumulativeSumAggColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToCumulativeSumAggColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToCumulativeSumAggColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
