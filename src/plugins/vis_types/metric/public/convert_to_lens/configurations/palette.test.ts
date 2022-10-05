/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorSchemas } from '@kbn/charts-plugin/common';
import { VisParams } from '../../types';
import { getPalette } from './palette';

describe('getPalette', () => {
  const params: VisParams = {
    addTooltip: false,
    addLegend: false,
    dimensions: {} as VisParams['dimensions'],
    metric: {
      percentageMode: false,
      percentageFormatPattern: '',
      useRanges: true,
      colorSchema: ColorSchemas.Greys,
      metricColorMode: 'Labels',
      colorsRange: [
        { type: 'range', from: 0, to: 100 },
        { type: 'range', from: 100, to: 200 },
        { type: 'range', from: 200, to: 300 },
      ],
      labels: {},
      invertColors: false,
      style: {} as VisParams['metric']['style'],
    },
    type: 'metric',
  };

  test('should return undefined if metricColorMode is `None`', () => {
    const metricColorMode = 'None';
    const paramsWithNoneMetricColorMode: VisParams = {
      ...params,
      metric: { ...params.metric, metricColorMode },
    };
    expect(getPalette(paramsWithNoneMetricColorMode)).toBeUndefined();
  });

  test('should return undefined if empty color ranges were passed', () => {
    const paramsWithNoneMetricColorMode: VisParams = {
      ...params,
      metric: { ...params.metric, colorsRange: [] },
    };
    expect(getPalette(paramsWithNoneMetricColorMode)).toBeUndefined();
  });

  test('should return correct palette', () => {
    expect(getPalette(params)).toEqual({
      name: 'custom',
      params: {
        colorStops: [
          { color: '#FFFFFF', stop: 0 },
          { color: '#979797', stop: 100 },
          { color: '#000000', stop: 200 },
        ],
        continuity: 'none',
        maxSteps: 5,
        name: 'custom',
        progression: 'fixed',
        rangeMax: 300,
        rangeMin: 0,
        rangeType: 'number',
        reverse: false,
        stops: [
          { color: '#FFFFFF', stop: 100 },
          { color: '#979797', stop: 200 },
          { color: '#000000', stop: 300 },
        ],
      },
      type: 'palette',
    });
  });
});
