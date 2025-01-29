/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AvgColumn, DateHistogramColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { Vis } from '@kbn/visualizations-plugin/public';
import { getConfiguration } from '.';
import { sampleHeatmapVis } from '../../sample_vis.test.mocks';
import { HeatmapVisParams } from '../../types';

describe('getConfiguration', () => {
  const layerId = 'layer-id';
  let vis: Vis<HeatmapVisParams>;

  const metric: AvgColumn = {
    sourceField: 'price',
    columnId: 'column-1',
    operationType: 'average',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
  };
  const xColumn: DateHistogramColumn = {
    sourceField: 'price',
    columnId: 'column-2',
    operationType: 'date_histogram',
    isBucketed: true,
    isSplit: false,
    dataType: 'string',
    params: {
      interval: '1h',
    },
  };

  const yColumn: DateHistogramColumn = {
    sourceField: 'price',
    columnId: 'column-3',
    operationType: 'date_histogram',
    isBucketed: true,
    isSplit: true,
    dataType: 'string',
    params: {
      interval: '1h',
    },
  };

  beforeEach(() => {
    vis = sampleHeatmapVis as unknown as Vis<HeatmapVisParams>;
  });

  test('should return valid configuration', async () => {
    const result = await getConfiguration(layerId, vis, {
      metrics: [metric.columnId],
      buckets: [xColumn.columnId, yColumn.columnId],
    });
    expect(result).toEqual({
      gridConfig: {
        isCellLabelVisible: true,
        isXAxisLabelVisible: true,
        isXAxisTitleVisible: true,
        isYAxisLabelVisible: true,
        isYAxisTitleVisible: true,
        type: 'heatmap_grid',
      },
      layerId,
      layerType: 'data',
      legend: { isVisible: undefined, position: 'right', type: 'heatmap_legend' },
      palette: {
        accessor: 'column-1',
        name: 'custom',
        params: {
          colorStops: [
            { color: '#F7FBFF', stop: 0 },
            { color: '#DEEBF7', stop: 12.5 },
            { color: '#C3DBEE', stop: 25 },
            { color: '#9CC8E2', stop: 37.5 },
            { color: '#6DAED5', stop: 50 },
            { color: '#4391C6', stop: 62.5 },
            { color: '#2271B3', stop: 75 },
            { color: '#0D5097', stop: 87.5 },
          ],
          continuity: 'none',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 100,
          rangeMin: 0,
          rangeType: 'percent',
          reverse: false,
          stops: [
            { color: '#F7FBFF', stop: 12.5 },
            { color: '#DEEBF7', stop: 25 },
            { color: '#C3DBEE', stop: 37.5 },
            { color: '#9CC8E2', stop: 50 },
            { color: '#6DAED5', stop: 62.5 },
            { color: '#4391C6', stop: 75 },
            { color: '#2271B3', stop: 87.5 },
            { color: '#0D5097', stop: 100 },
          ],
        },
        type: 'palette',
      },
      shape: 'heatmap',
      valueAccessor: metric.columnId,
      xAccessor: xColumn.columnId,
      yAccessor: yColumn.columnId,
    });
  });
});
