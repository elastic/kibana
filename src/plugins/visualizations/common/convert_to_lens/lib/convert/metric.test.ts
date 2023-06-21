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
import { convertMetricAggregationColumnWithoutSpecialParams } from './metric';
import { SUPPORTED_METRICS } from './supported_metrics';

const mockGetFieldByName = jest.fn();

describe('convertToLastValueColumn', () => {
  const dataView = stubLogstashDataView;
  const visType = 'heatmap';

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
    mockGetFieldByName.mockReturnValue(dataView.fields[0]);
    dataView.getFieldByName = mockGetFieldByName;
  });

  test('should return null metric is not supported', () => {
    expect(
      convertMetricAggregationColumnWithoutSpecialParams(SUPPORTED_METRICS[METRIC_TYPES.TOP_HITS], {
        agg,
        dataView,
        visType,
      })
    ).toBeNull();
  });

  test('should skip if field is not present and is required for the aggregation', () => {
    mockGetFieldByName.mockReturnValue(null);
    dataView.getFieldByName = mockGetFieldByName;

    expect(
      convertMetricAggregationColumnWithoutSpecialParams(SUPPORTED_METRICS[METRIC_TYPES.AVG], {
        agg,
        dataView,
        visType,
      })
    ).toBeNull();
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return column if field is not present and is not required for the aggregation', () => {
    mockGetFieldByName.mockReturnValue(null);
    dataView.getFieldByName = mockGetFieldByName;

    expect(
      convertMetricAggregationColumnWithoutSpecialParams(SUPPORTED_METRICS[METRIC_TYPES.COUNT], {
        agg,
        dataView,
        visType,
      })
    ).toEqual(expect.objectContaining({ operationType: 'count' }));
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });

  test('should return column if field is present and is required for the aggregation', () => {
    mockGetFieldByName.mockReturnValue(dataView.fields[0]);
    dataView.getFieldByName = mockGetFieldByName;

    expect(
      convertMetricAggregationColumnWithoutSpecialParams(SUPPORTED_METRICS[METRIC_TYPES.AVG], {
        agg,
        dataView,
        visType,
      })
    ).toEqual(
      expect.objectContaining({
        dataType: 'number',
        operationType: 'average',
      })
    );
    expect(dataView.getFieldByName).toBeCalledTimes(1);
  });
});
