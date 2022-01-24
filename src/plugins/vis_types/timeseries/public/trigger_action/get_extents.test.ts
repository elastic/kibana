/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Panel } from '../../common/types';
import { getYExtents } from './get_extents';

const model = {
  axis_position: 'left',
  series: [
    {
      axis_position: 'right',
      chart_type: 'line',
      fill: '0',
      id: '85147356-c185-4636-9182-d55f3ab2b6fa',
      line_width: 1,
      metrics: [
        {
          id: '3fa8b32f-5c38-4813-9361-1f2817ae5b18',
          type: 'count',
        },
      ],
      override_index_pattern: 0,
      separate_axis: 0,
    },
  ],
} as Panel;

describe('getYExtents', () => {
  test('should return no extents if no extents are given from the user', () => {
    const { yLeftExtent } = getYExtents(model);
    expect(yLeftExtent).toStrictEqual({ mode: 'full' });
  });

  test('should return the global extents, if no specific extents are given per series', () => {
    const modelOnlyGlobalSettings = {
      ...model,
      axis_max: '10',
      axis_min: '2',
    };
    const { yLeftExtent } = getYExtents(modelOnlyGlobalSettings);
    expect(yLeftExtent).toStrictEqual({ mode: 'custom', lowerBound: 2, upperBound: 10 });
  });

  test('should return the series extents, if specific extents are given per series', () => {
    const modelWithExtentsOnSeries = {
      ...model,
      axis_max: '10',
      axis_min: '2',
      series: [
        {
          ...model.series[0],
          axis_max: '14',
          axis_min: '1',
          separate_axis: 1,
          axis_position: 'left',
        },
      ],
    };
    const { yLeftExtent } = getYExtents(modelWithExtentsOnSeries);
    expect(yLeftExtent).toStrictEqual({ mode: 'custom', lowerBound: 1, upperBound: 14 });
  });

  test('should not send the lowerbound for a bar chart', () => {
    const modelWithExtentsOnSeries = {
      ...model,
      axis_max: '10',
      axis_min: '2',
      series: [
        {
          ...model.series[0],
          axis_max: '14',
          axis_min: '1',
          separate_axis: 1,
          axis_position: 'left',
          chart_type: 'bar',
        },
      ],
    };
    const { yLeftExtent } = getYExtents(modelWithExtentsOnSeries);
    expect(yLeftExtent).toStrictEqual({ mode: 'custom', upperBound: 14 });
  });

  test('should merge the extents for 2 series on the same axis', () => {
    const modelWithExtentsOnSeries = {
      ...model,
      axis_max: '10',
      axis_min: '2',
      series: [
        {
          ...model.series[0],
          axis_max: '14',
          axis_min: '1',
          separate_axis: 1,
          axis_position: 'left',
        },
        {
          ...model.series[0],
          axis_max: '20',
          axis_min: '5',
          separate_axis: 1,
          axis_position: 'left',
        },
      ],
    };
    const { yLeftExtent } = getYExtents(modelWithExtentsOnSeries);
    expect(yLeftExtent).toStrictEqual({ mode: 'custom', lowerBound: 1, upperBound: 20 });
  });
});
