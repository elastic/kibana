/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getColumns } from './get_columns';
import { PieVisParams } from '../types';
import { createMockPieParams, createMockVisData } from '../mocks';

const visParams = createMockPieParams();
const visData = createMockVisData();

describe('getColumns', () => {
  it('should return the correct bucket columns if visParams returns dimensions', () => {
    const { bucketColumns } = getColumns(visParams, visData);
    expect(bucketColumns.length).toEqual(visParams.dimensions.buckets?.length);
    expect(bucketColumns).toEqual([
      {
        format: {
          id: 'terms',
          params: {
            id: 'string',
            missingBucketLabel: 'Missing',
            otherBucketLabel: 'Other',
          },
        },
        id: 'col-0-2',
        meta: {
          field: 'Carrier',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              missingBucketLabel: 'Missing',
              otherBucketLabel: 'Other',
            },
          },
          source: 'esaggs',
          sourceParams: {
            enabled: true,
            id: '2',
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            params: {
              field: 'Carrier',
              missingBucket: false,
              missingBucketLabel: 'Missing',
              order: 'desc',
              orderBy: '1',
              otherBucket: false,
              otherBucketLabel: 'Other',
              size: 5,
            },
            schema: 'segment',
            type: 'terms',
          },
          type: 'string',
        },
        name: 'Carrier: Descending',
      },
      {
        format: {
          id: 'terms',
          params: {
            id: 'boolean',
            missingBucketLabel: 'Missing',
            otherBucketLabel: 'Other',
          },
        },
        id: 'col-2-3',
        meta: {
          field: 'Cancelled',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'boolean',
              missingBucketLabel: 'Missing',
              otherBucketLabel: 'Other',
            },
          },
          source: 'esaggs',
          sourceParams: {
            enabled: true,
            id: '3',
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            params: {
              field: 'Cancelled',
              missingBucket: false,
              missingBucketLabel: 'Missing',
              order: 'desc',
              orderBy: '1',
              otherBucket: false,
              otherBucketLabel: 'Other',
              size: 5,
            },
            schema: 'segment',
            type: 'terms',
          },
          type: 'boolean',
        },
        name: 'Cancelled: Descending',
      },
    ]);
  });

  it('should return the correct metric column if visParams returns dimensions', () => {
    const { metricColumn } = getColumns(visParams, visData);
    expect(metricColumn).toEqual({
      id: 'col-3-1',
      meta: {
        index: 'kibana_sample_data_flights',
        params: { id: 'number' },
        source: 'esaggs',
        sourceParams: {
          enabled: true,
          id: '1',
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          params: {},
          schema: 'metric',
          type: 'count',
        },
        type: 'number',
      },
      name: 'Count',
    });
  });

  it('should return the first data column if no buckets specified', () => {
    const visParamsOnlyMetric = {
      addLegend: true,
      addTooltip: true,
      isDonut: true,
      labels: {
        position: 'default',
        show: true,
        truncate: 100,
        values: true,
        valuesFormat: 'percent',
        percentDecimals: 2,
      },
      legendPosition: 'right',
      nestedLegend: false,
      maxLegendLines: 1,
      truncateLegend: false,
      palette: {
        name: 'default',
        type: 'palette',
      },
      type: 'pie',
      dimensions: {
        metric: {
          accessor: 1,
          format: {
            id: 'number',
          },
          params: {},
          label: 'Count',
          aggType: 'count',
        },
      },
    } as unknown as PieVisParams;
    const { metricColumn } = getColumns(visParamsOnlyMetric, visData);
    expect(metricColumn).toEqual({
      id: 'col-1-1',
      meta: {
        index: 'kibana_sample_data_flights',
        params: {
          id: 'number',
        },
        source: 'esaggs',
        sourceParams: {
          enabled: true,
          id: '1',
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          params: {},
          schema: 'metric',
          type: 'count',
        },
        type: 'number',
      },
      name: 'Count',
    });
  });

  it('should return an object with the name of the metric if no buckets specified', () => {
    const visParamsOnlyMetric = {
      addLegend: true,
      addTooltip: true,
      isDonut: true,
      labels: {
        position: 'default',
        show: true,
        truncate: 100,
        values: true,
        valuesFormat: 'percent',
        percentDecimals: 2,
      },
      legendPosition: 'right',
      nestedLegend: false,
      palette: {
        name: 'default',
        type: 'palette',
      },
      type: 'pie',
      dimensions: {
        metric: {
          accessor: 1,
          format: {
            id: 'number',
          },
          params: {},
          label: 'Count',
          aggType: 'count',
        },
      },
    } as unknown as PieVisParams;
    const { bucketColumns, metricColumn } = getColumns(visParamsOnlyMetric, visData);
    expect(bucketColumns).toEqual([{ name: metricColumn.name }]);
  });
});
