/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { convertToSiblingPipelineColumns } from './sibling_pipeline';

const mockConvertMetricToColumns = jest.fn();
const mockConvertToSchemaConfig = jest.fn();

jest.mock('../metrics', () => ({
  convertMetricToColumns: jest.fn(() => mockConvertMetricToColumns()),
}));

jest.mock('../../../vis_schemas', () => ({
  convertToSchemaConfig: jest.fn(() => mockConvertToSchemaConfig()),
}));

describe('convertToSiblingPipelineColumns', () => {
  const visType = 'heatmap';
  const dataView = stubLogstashDataView;
  const aggId = 'agg-id-1';
  const agg: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG_BUCKET,
    aggParams: { customMetric: {} as IAggConfig },
    aggId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConvertMetricToColumns.mockReturnValue([{}]);
    mockConvertToSchemaConfig.mockReturnValue({});
  });

  test('should return null if aggParams are not defined', () => {
    expect(
      convertToSiblingPipelineColumns({
        agg: { ...agg, aggParams: undefined },
        aggs: [],
        dataView,
        visType,
      })
    ).toBeNull();
    expect(mockConvertMetricToColumns).toBeCalledTimes(0);
  });

  test('should return null if customMetric is not defined', () => {
    expect(
      convertToSiblingPipelineColumns({
        agg: { ...agg, aggParams: { customMetric: undefined } },
        aggs: [],
        dataView,
        visType,
      })
    ).toBeNull();
    expect(mockConvertMetricToColumns).toBeCalledTimes(0);
  });

  test('should return null if sibling agg is not supported', () => {
    mockConvertMetricToColumns.mockReturnValue(null);
    expect(convertToSiblingPipelineColumns({ agg, aggs: [], dataView, visType })).toBeNull();
    expect(mockConvertToSchemaConfig).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(1);
  });

  test('should return column', () => {
    const column = { operationType: 'formula' };
    mockConvertMetricToColumns.mockReturnValue([column]);
    expect(convertToSiblingPipelineColumns({ agg, aggs: [], dataView, visType })).toEqual(column);
    expect(mockConvertToSchemaConfig).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(1);
  });
});
